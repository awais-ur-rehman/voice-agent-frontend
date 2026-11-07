import {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "../../app/auth";
import { DashboardError } from "../../api/dashboard";
import type {
  SearchQuery,
  SearchResult,
  SourceOut,
} from "../../api/dashboard.generated";
import {
  EmptyState,
  ErrorSummary,
  StatusBadge,
} from "../../components/ui/patterns";
import { QueryState } from "../clinic/ClinicPages";
import { KnowledgeWrite } from "./write";
import { SourceDialog, type SourceAction } from "./SourceDialog";
const statusText = (source: SourceOut) =>
  source.status === "failed"
    ? source.available
      ? "Update failed"
      : "Failed"
    : source.status === "queued"
      ? "Queued"
      : source.status === "processing"
        ? "Processing"
        : source.status === "ready"
          ? "Ready"
          : "Deleted";
const processingReason: Record<string, string> = {
  disabled: "Knowledge is disabled.",
  processing_unavailable:
    "New sources can be saved but cannot be processed yet.",
  worker_stale: "New sources can be saved while processing is unavailable.",
  embedding_unavailable: "New content is waiting for the knowledge service.",
  artifacts_unavailable: "New content cannot be processed yet.",
};
import { queryReason } from "./presentation";
export function KnowledgeDashboard({
  agentId,
  active,
  disabled,
  onUnresolved,
}: {
  agentId: string;
  active: boolean;
  disabled: boolean;
  onUnresolved: (value: boolean) => void;
}) {
  const auth = useAuth();
  const client = useQueryClient();
  const sessionKey = useSessionKey("knowledge", agentId);
  const key = useMemo(() => sessionKey, [sessionKey.join(":")]);
  const params = { agent_id: agentId };
  const sources = useQuery({
    queryKey: [...key, "sources"],
    queryFn: ({ signal }) =>
      auth.request("GET /dashboard/agents/{agent_id}/knowledge/sources", {
        params,
        signal,
      }),
    enabled: active,
    refetchInterval: (query) =>
      active &&
      query.state.data?.some(
        (s) => s.status === "queued" || s.status === "processing",
      )
        ? 2000
        : false,
  });
  const queued =
    sources.data?.some(
      (s) => s.status === "queued" || s.status === "processing",
    ) ?? false;
  const capabilities = useQuery({
    queryKey: [...key, "capabilities"],
    queryFn: ({ signal }) =>
      auth.request("GET /dashboard/agents/{agent_id}/knowledge/capabilities", {
        params,
        signal,
      }),
    enabled: active,
    refetchInterval: active && queued ? 2000 : false,
  });
  const [writer] = useState(
    () => new KnowledgeWrite(auth.request, auth.registerCleanup),
  );
  const state = useSyncExternalStore(writer.subscribe, writer.getSnapshot);
  const opener = useRef<HTMLElement | null>(null);
  const addButton = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useCallback(() => {
    (opener.current?.isConnected ? opener.current : addButton.current)?.focus();
  }, []);
  const [action, setAction] = useState<SourceAction | null>(null);
  const [preparing, setPreparing] = useState(false);
  useEffect(() => {
    writer.mount();
    return () => writer.dispose();
  }, [writer]);
  useEffect(() => {
    onUnresolved(state.pending || preparing);
  }, [state.pending, preparing, onUnresolved]);
  useEffect(
    () =>
      auth.registerCleanup(() => {
        onUnresolved(false);
        setAction(null);
        setPreparing(false);
      }),
    [auth.registerCleanup, onUnresolved],
  );
  // Invalidate only knowledge; source writes never replace the editor's dirty draft.
  useEffect(() => {
    if (state.result) void client.invalidateQueries({ queryKey: key });
  }, [state.result, client, key]);
  const close = useCallback(() => setAction(null), []);
  function open(next: SourceAction) {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    writer.clear();
    setAction(next);
  }
  const locked = disabled || state.pending || preparing;
  const writable = !locked && capabilities.data?.enabled;
  return (
    <div className="knowledge-workspace" hidden={!active}>
      <div className="knowledge-heading">
        <div>
          <h2>Knowledge sources</h2>
          <p className="muted">
            Processed updates are used immediately. Publish only applies to the
            agent draft.
          </p>
        </div>
        <button
          className="button"
          disabled={
            !writable ||
            (sources.data?.length ?? 0) >=
              (capabilities.data?.source_limit ?? 64)
          }
          ref={addButton}
          onClick={() => open({ kind: "add" })}
        >
          Add source
        </button>
      </div>
      <QueryState query={capabilities}>
        {capabilities.data && (
          <div className="knowledge-capabilities">
            <p>
              <strong>
                {capabilities.data.processing_available
                  ? "Processing available"
                  : "Processing unavailable"}
              </strong>
              {!capabilities.data.processing_available &&
                ` · ${processingReason[capabilities.data.unavailable_reason ?? "processing_unavailable"]}`}
            </p>
            <p>
              {capabilities.data.query_available
                ? "Knowledge search is available. Previous processed versions can still answer while updates are pending or failed."
                : queryReason[
                    capabilities.data.query_unavailable_reason ??
                      "service_unavailable"
                  ]}
            </p>
          </div>
        )}
      </QueryState>
      <div className="knowledge-refresh">
        <span className="muted">
          {sources.data
            ? `${sources.data.length} of ${capabilities.data?.source_limit ?? 64} sources`
            : "Source library"}
          {queued ? " · Checking processing status" : ""}
        </span>
        <button
          className="button secondary"
          disabled={sources.isFetching || capabilities.isFetching}
          onClick={() => {
            void sources.refetch();
            void capabilities.refetch();
          }}
        >
          Refresh sources
        </button>
      </div>
      <QueryState query={sources}>
        {sources.data &&
          (sources.data.length ? (
            <div className="knowledge-table-wrap">
              <table className="knowledge-table">
                <caption className="sr-only">
                  Knowledge source status and actions
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.data.map((source) => (
                    <tr key={source.id}>
                      <td>
                        <strong dir="auto">{source.name}</strong>
                        <span className="muted">
                          {source.kind} · revision {source.revision}
                        </span>
                        <span className="muted">
                          Updated{" "}
                          <time dateTime={source.updated_at}>
                            {new Intl.DateTimeFormat("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "UTC",
                              timeZoneName: "short",
                            }).format(new Date(source.updated_at))}
                          </time>
                        </span>
                      </td>
                      <td>
                        <StatusBadge>{statusText(source)}</StatusBadge>
                        <span className="muted">
                          {source.available
                            ? source.status === "ready"
                              ? `${source.chunk_count} processed chunks`
                              : "Previous version available"
                            : "Not available for answers"}
                        </span>
                        {source.error_code && (
                          <span className="muted">
                            {source.error_code === "embedding_unavailable"
                              ? "Processing service unavailable."
                              : "Processing could not finish. Review the source and reindex."}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="knowledge-actions">
                          <button
                            className="button secondary"
                            disabled={locked}
                            onClick={() => open({ kind: "preview", source })}
                          >
                            Preview
                          </button>
                          <button
                            className="button secondary"
                            disabled={!writable}
                            onClick={() => open({ kind: "edit", source })}
                          >
                            Edit
                          </button>
                          <button
                            className="button secondary"
                            disabled={!writable}
                            onClick={() => open({ kind: "reindex", source })}
                          >
                            Reindex
                          </button>
                          <button
                            className="button secondary"
                            disabled={!writable}
                            onClick={() => open({ kind: "delete", source })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No knowledge sources yet.</EmptyState>
          ))}
      </QueryState>
      <KnowledgeSearch
        agentId={agentId}
        available={!!capabilities.data?.query_available}
        disabled={locked}
      />
      {action && (
        <SourceDialog
          key={`${action.kind}:${action.source?.id ?? "new"}`}
          agentId={agentId}
          action={action}
          capabilities={capabilities.data}
          writer={writer}
          preparing={preparing}
          onClose={close}
          onRestoreFocus={restoreFocus}
          onPreparing={setPreparing}
        />
      )}
    </div>
  );
}
function KnowledgeSearch({
  agentId,
  available,
  disabled,
}: {
  agentId: string;
  available: boolean;
  disabled: boolean;
}) {
  const auth = useAuth();
  const authorized = useRef(true);
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"en" | "ur">("en");
  const [intent, setIntent] = useState<SearchQuery | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<unknown>();
  useEffect(
    () =>
      auth.registerCleanup(() => {
        authorized.current = false;
        setIntent(null);
        setQuery("");
        setResult(null);
        setError(null);
      }),
    [auth.registerCleanup],
  );
  async function search() {
    if (!authorized.current || busy || disabled) return;
    if (!query.trim()) {
      setError("Enter a knowledge question.");
      return;
    }
    const captured = intent ?? {
      query: query.trim(),
      language,
      query_id: crypto.randomUUID(),
    };
    setIntent(captured);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await auth.request(
        "POST /dashboard/agents/{agent_id}/knowledge/search",
        { params: { agent_id: agentId }, body: captured },
      );
      if (!authorized.current) return;
      setResult(response);
      setIntent(null);
    } catch (e) {
      if (!authorized.current) return;
      setError(e);
      if (e instanceof DashboardError && e.status < 500 && e.status !== 408)
        setIntent(null);
    } finally {
      if (authorized.current) setBusy(false);
    }
  }
  return (
    <section
      className="knowledge-search"
      aria-labelledby="knowledge-search-title"
    >
      <h3 id="knowledge-search-title">Check knowledge matches</h3>
      <p className="muted">
        Search the processed sources. Use the isolated test panel to test an
        agent reply.
      </p>
      <form
        className="form-field"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label htmlFor="knowledge-question">Knowledge question</label>
        <textarea
          id="knowledge-question"
          dir="auto"
          maxLength={1000}
          value={query}
          disabled={busy || !!intent || disabled}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label htmlFor="knowledge-language">Question language</label>
        <select
          id="knowledge-language"
          value={language}
          disabled={busy || !!intent || disabled}
          onChange={(e) => setLanguage(e.target.value as "en" | "ur")}
        >
          <option value="en">English</option>
          <option value="ur">Urdu</option>
        </select>
        <div className="form-actions">
          <button
            className="button secondary"
            disabled={busy || disabled || (!available && !intent)}
          >
            {busy
              ? "Searching…"
              : intent
                ? "Retry same search"
                : "Search knowledge"}
          </button>
          {intent && !busy && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setIntent(null);
                setError(null);
              }}
            >
              Start a new search
            </button>
          )}
        </div>
      </form>
      <ErrorSummary error={error} />
      {result && (
        <div aria-live="polite">
          <p>{queryReason[result.reason]}</p>
          {result.chunks.slice(0, 4).map((chunk) => (
            <article className="knowledge-match" key={chunk.chunk_id}>
              <strong dir="auto">{chunk.name.slice(0, 200)}</strong>
              {chunk.heading && <p dir="auto">{chunk.heading.slice(0, 200)}</p>}
              <blockquote
                className="knowledge-excerpt"
                dir="auto"
                lang={chunk.language === "ur" ? "ur" : "en"}
              >
                {chunk.text.slice(0, 2000)}
              </blockquote>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
