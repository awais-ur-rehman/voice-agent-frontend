import type { Session } from "../../api/session";
import { DashboardError } from "../../api/dashboard";
import type {
  TestSnapshot,
  TestTurn,
  ToolTrace,
  VoiceSnapshot,
} from "../../api/dashboard.generated";
import {
  createLiveMedia,
  type MediaConnection,
  type MediaEvents,
  type MediaState,
} from "../voice/media";
export type MediaFactory = (events: MediaEvents) => MediaConnection;
type State = {
  snapshot: TestSnapshot | null;
  busy: boolean;
  pendingTurn: boolean;
  pendingEnd: boolean;
  error: string;
  mediaState: MediaState | null;
  caption: { text: string; lang: "en" | "ur" } | null;
  audioBlocked: boolean;
  muted: boolean;
  showCaptions: boolean;
  trace: ToolTrace[];
};
const initial = (): State => ({
  snapshot: null,
  busy: false,
  pendingTurn: false,
  pendingEnd: false,
  error: "",
  mediaState: null,
  caption: null,
  audioBlocked: false,
  muted: false,
  showCaptions: false,
  trace: [],
});
/** Owns one staff-authenticated isolated scope. Never substitutes its ID for a media session ID. */
export class IsolatedTest {
  private state = initial();
  private listeners = new Set<() => void>();
  private media: MediaConnection | null = null;
  private authorized = true;
  private mounted = false;
  private epoch = 0;
  private unregister: () => void = () => {};
  private allocation: { agent: string; revision: number; key: string } | null =
    null;
  private voiceKey: string | null = null;
  private command: TestTurn | null = null;
  constructor(
    private request: Session["request"],
    private register: Session["registerCleanup"],
    private factory: MediaFactory = createLiveMedia,
  ) {}
  mount() {
    if (!this.authorized || this.mounted) return;
    this.mounted = true;
    this.unregister = this.register(() => {
      this.authorized = false;
      this.epoch++;
      this.disconnect();
      this.allocation = null;
      this.command = null;
      this.update(initial());
    });
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
  private current(epoch: number) {
    return this.mounted && this.authorized && epoch === this.epoch;
  }
  private disconnect() {
    const old = this.media;
    this.media = null;
    void Promise.resolve(old?.disconnect()).catch(() => {});
    this.update({
      caption: null,
      audioBlocked: false,
      muted: false,
      mediaState: null,
    });
  }
  private async cleanup(identity: string, voice = false) {
    if (!this.authorized) return;
    await this.request(
      voice
        ? "POST /dashboard/tests/{identity}/voice/end"
        : "POST /dashboard/tests/{identity}/end",
      { params: { identity } },
    ).catch(() => {});
  }
  private failure(error: unknown, kind: string) {
    if (error instanceof DOMException && error.name === "NotAllowedError")
      return "Microphone access was denied. Allow microphone access, then start voice again.";
    if (error instanceof DashboardError && [404, 410].includes(error.status))
      return "This isolated test has expired or is no longer available. Start a new test.";
    return kind;
  }
  async start(agent: string, revision: number) {
    if (!this.authorized || !this.mounted || this.state.busy) return;
    const epoch = ++this.epoch;
    this.disconnect();
    this.allocation ??= { agent, revision, key: crypto.randomUUID() };
    const intent = this.allocation;
    this.update({ busy: true, error: "", trace: [] });
    try {
      const snapshot = await this.request(
        "POST /dashboard/agents/{agent_id}/tests",
        {
          params: { agent_id: intent.agent },
          body: { draft_revision: intent.revision },
          idempotencyKey: intent.key,
        },
      );
      if (!this.current(epoch)) {
        await this.cleanup(snapshot.id);
        return;
      }
      this.allocation = null;
      this.command = null;
      this.update({ snapshot });
    } catch (error) {
      if (this.current(epoch))
        this.update({
          error: this.failure(
            error,
            "Could not start the isolated test. Retry uses the same request.",
          ),
        });
    } finally {
      if (this.current(epoch)) this.update({ busy: false });
      if (!this.mounted) this.unregister();
    }
  }
  async turn(text: string) {
    const snapshot = this.state.snapshot;
    if (
      !this.authorized ||
      !this.mounted ||
      this.state.busy ||
      this.state.pendingEnd ||
      snapshot?.status !== "active" ||
      !snapshot.transport_capabilities.text.available
    )
      return;
    const epoch = this.epoch;
    this.command ??= {
      text,
      revision: snapshot.conversation.revision,
      command_id: crypto.randomUUID(),
    };
    this.update({ busy: true, error: "", pendingTurn: true });
    try {
      const result = await this.request(
        "POST /dashboard/tests/{identity}/turns",
        { params: { identity: snapshot.id }, body: this.command },
      );
      if (!this.current(epoch)) return;
      this.command = null;
      this.update({
        pendingTurn: false,
        snapshot: {
          ...snapshot,
          status: result.status,
          conversation: {
            ...snapshot.conversation,
            messages: result.messages,
            revision: result.revision,
          },
        },
        trace: result.tool_trace,
      });
      if (result.status !== "active") this.disconnect();
    } catch (error) {
      if (this.current(epoch)) {
        if (
          error instanceof DashboardError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408
        )
          this.command = null;
        if (
          error instanceof DashboardError &&
          [404, 410].includes(error.status)
        ) {
          this.expire();
          return;
        }
        this.update({
          pendingTurn: !!this.command,
          error: this.failure(
            error,
            "Text response could not be confirmed. Retry sends the same turn.",
          ),
        });
      }
    } finally {
      if (this.current(epoch)) this.update({ busy: false });
      if (!this.mounted) this.unregister();
    }
  }
  async voice(resume = false) {
    const snapshot = this.state.snapshot;
    if (
      !this.authorized ||
      !this.mounted ||
      this.state.busy ||
      this.state.pendingEnd ||
      snapshot?.status !== "active" ||
      !snapshot.transport_capabilities.voice.available
    )
      return;
    const epoch = ++this.epoch;
    this.disconnect();
    this.update({ busy: true, error: "", mediaState: "connecting" });
    let next: VoiceSnapshot | undefined;
    try {
      this.voiceKey ??= crypto.randomUUID();
      next = await this.request(
        resume
          ? "POST /dashboard/tests/{identity}/voice/resume"
          : "POST /dashboard/tests/{identity}/voice",
        {
          params: { identity: snapshot.id },
          ...(resume ? {} : { body: { request_key: this.voiceKey } }),
        },
      );
      if (!this.current(epoch)) {
        await this.cleanup(snapshot.id, true);
        return;
      }
      if (next.status !== "active" || !next.media)
        throw Error("Speech unavailable");
      if (
        next.media.session_id !== next.session_id ||
        next.media.generation !== next.generation ||
        Date.parse(next.media.expires_at) <= Date.now()
      )
        throw Error("Invalid media grant");
      const current = this.factory({
        state: (s) => {
          if (this.current(epoch)) this.update({ mediaState: s });
        },
        caption: (text, lang) => {
          if (this.current(epoch) && this.state.showCaptions)
            this.update({ caption: { text, lang } });
        },
        audioBlocked: () => {
          if (this.current(epoch)) this.update({ audioBlocked: true });
        },
        error: (message) => {
          if (this.current(epoch))
            this.update({ error: message, mediaState: "error" });
        },
      });
      this.media = current;
      await current.connect(next.media);
      if (!this.current(epoch)) {
        await current.disconnect();
        return;
      }
      this.voiceKey = null;
      if (this.state.mediaState === "connecting")
        this.update({ mediaState: "connected" });
    } catch (error) {
      if (this.current(epoch)) {
        this.disconnect();
        const message =
          error instanceof Error && error.message === "Invalid media grant"
            ? "The media grant is stale or does not match its runtime session."
            : this.failure(
                error,
                "Speech is unavailable. Native ASR and Urdu readiness must be confirmed before a voice test.",
              );
        this.update({ error: message, mediaState: "error" });
        if (next) {
          await this.cleanup(snapshot.id, true);
          this.voiceKey = null;
        }
      }
    } finally {
      if (this.current(epoch)) this.update({ busy: false });
      if (!this.mounted) this.unregister();
    }
  }
  async end() {
    if (!this.authorized || !this.mounted || this.state.busy) return;
    const snapshot = this.state.snapshot;
    const epoch = ++this.epoch;
    this.disconnect();
    this.update({ busy: true, pendingEnd: true, error: "", trace: [] });
    try {
      if (snapshot) {
        const result = await this.request(
          "POST /dashboard/tests/{identity}/end",
          { params: { identity: snapshot.id } },
        );
        if (this.current(epoch)) {
          if (result.status === "active") throw Error("End unconfirmed");
          this.command = null;
          this.update({
            snapshot: result,
            pendingEnd: false,
            pendingTurn: false,
          });
        }
      }
    } catch (error) {
      if (this.current(epoch))
        this.update({
          error: this.failure(
            error,
            "Test end could not be confirmed. Retry End test.",
          ),
        });
    } finally {
      if (this.current(epoch)) this.update({ busy: false });
      if (!this.mounted) this.unregister();
    }
  }
  captions(showCaptions: boolean) {
    this.update({ showCaptions, ...(!showCaptions ? { caption: null } : {}) });
  }
  async enableAudio() {
    const epoch = this.epoch;
    try {
      await this.media?.enableAudio();
      if (this.current(epoch)) this.update({ audioBlocked: false });
    } catch {
      if (this.current(epoch))
        this.update({
          error: "Playback is blocked. Allow sound and try again.",
        });
    }
  }
  async mute() {
    const epoch = this.epoch,
      muted = !this.state.muted;
    try {
      await this.media?.setMuted(muted);
      if (this.current(epoch)) this.update({ muted, caption: null });
    } catch {
      if (this.current(epoch))
        this.update({
          error: "Microphone change failed. End or reconnect the test.",
        });
    }
  }
  expire() {
    this.command = null;
    this.epoch++;
    this.disconnect();
    this.update({
      busy: false,
      snapshot: this.state.snapshot
        ? { ...this.state.snapshot, status: "expired" }
        : null,
      pendingTurn: false,
      pendingEnd: false,
      error: "This isolated test has expired. Start a new test.",
      trace: [],
    });
  }
  dispose() {
    if (!this.mounted) return;
    this.mounted = false;
    this.epoch++;
    this.disconnect();
    const snapshot = this.state.snapshot;
    if (snapshot) void this.cleanup(snapshot.id);
    /* Retain auth-reset listener until pending allocation settles: it prevents old-scope cleanup with new credentials. */ this.listeners.clear();
    if (!this.state.busy) this.unregister();
  }
}
