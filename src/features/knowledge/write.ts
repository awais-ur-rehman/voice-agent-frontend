import {
  DashboardError,
  type Operation,
  type RequestOptions,
} from "../../api/dashboard";
import type { Session } from "../../api/session";
import type { SourceOut } from "../../api/dashboard.generated";
type WriteOperation = Extract<
  Operation,
  `${"POST" | "PUT" | "DELETE"} /dashboard/agents/{agent_id}/knowledge/sources${string}`
>;
export type Command = {
  [K in WriteOperation]: { operation: K; options: RequestOptions<K> };
}[WriteOperation];
export async function captureFile(
  agentId: string,
  name: string,
  format: "txt" | "md" | "pdf" | "docx",
  file: File,
  source?: { id: string; revision: number },
): Promise<Command> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const checksum = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    operation: source
      ? "PUT /dashboard/agents/{agent_id}/knowledge/sources/{source_id}/content"
      : "POST /dashboard/agents/{agent_id}/knowledge/sources/upload",
    options: {
      params: {
        agent_id: agentId,
        ...(source ? { source_id: source.id } : {}),
      },
      query: {
        name: name.trim(),
        format,
        ...(source ? { revision: source.revision } : {}),
      },
      body: file,
      checksum,
      idempotencyKey: crypto.randomUUID(),
    },
  };
}
type State = {
  busy: boolean;
  pending: boolean;
  error: unknown;
  result: SourceOut | null;
};
const initial = (): State => ({
  busy: false,
  pending: false,
  error: null,
  result: null,
});
/** Exact reviewed request lives only in this original authenticated scope. */
export class KnowledgeWrite {
  private state = initial();
  private command: Command | null = null;
  private authorized = true;
  private mounted = false;
  private unregister = () => {};
  private listeners = new Set<() => void>();
  constructor(
    private request: Session["request"],
    private register: Session["registerCleanup"],
  ) {}
  mount() {
    if (!this.authorized || this.mounted) return;
    this.mounted = true;
    this.unregister = this.register(() => {
      this.authorized = false;
      this.command = null;
      this.update(initial());
    });
  }
  dispose() {
    this.mounted = false;
    this.unregister();
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  private update(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  clear() {
    if (!this.command && !this.state.busy) this.update(initial());
  }
  async submit(command: Command) {
    if (!this.authorized || !this.mounted || this.command || this.state.busy)
      return;
    this.command = command;
    await this.retry();
  }
  async retry() {
    if (!this.authorized || !this.mounted || this.state.busy || !this.command)
      return;
    const command = this.command;
    this.update({ busy: true, pending: true, error: null, result: null });
    try {
      const result = await this.request(command.operation, command.options);
      if (!this.authorized || !this.mounted) return;
      this.command = null;
      this.update({ result, pending: false });
    } catch (error) {
      if (!this.authorized || !this.mounted) return;
      const definite =
        error instanceof DashboardError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408;
      if (definite) this.command = null;
      this.update({ error, pending: !definite });
    } finally {
      if (this.authorized && this.mounted) this.update({ busy: false });
    }
  }
}
