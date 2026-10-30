import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth, useSessionKey } from "../../app/auth";
import { DashboardError } from "../../api/dashboard";
import type {
  Knowledge_Contracts__Capabilities as Capabilities,
  SourceDetailOut,
  SourceOut,
} from "../../api/dashboard.generated";
import { ErrorSummary } from "../../components/ui/patterns";
import { QueryState } from "../clinic/ClinicPages";
import { captureFile, KnowledgeWrite, type Command } from "./write";
export type SourceAction = {
  kind: "add" | "edit" | "preview" | "delete" | "reindex";
  source?: SourceOut;
};
type Props = {
  agentId: string;
  action: SourceAction;
  capabilities?: Capabilities | undefined;
  writer: KnowledgeWrite;
  preparing: boolean;
  onClose: () => void;
  onRestoreFocus: () => void;
  onPreparing: (busy: boolean) => void;
};
export function SourceDialog(props: Props) {
  const { agentId, action, writer, onClose, preparing } = props;
  const auth = useAuth();
  const state = useSyncExternalStore(writer.subscribe, writer.getSnapshot);
  const params = { agent_id: agentId, source_id: action.source?.id ?? "" };
  // Each opening must initialize from its own protected read, never a prior
  // form's cached revision. Later refetches leave this opening's input intact.
  const [detailRead] = useState(() => crypto.randomUUID());
  const detail = useQuery({
    queryKey: useSessionKey("knowledge-detail", params, detailRead),
    queryFn: ({ signal }) =>
      auth.request(
        "GET /dashboard/agents/{agent_id}/knowledge/sources/{source_id}",
        { params, signal },
      ),
    enabled: !!action.source && action.kind === "edit",
    staleTime: 0,
    gcTime: 0,
  });
  const preview = useQuery({
    queryKey: useSessionKey("knowledge-preview", params),
    queryFn: ({ signal }) =>
      auth.request(
        "GET /dashboard/agents/{agent_id}/knowledge/sources/{source_id}/preview",
        { params, signal },
      ),
    enabled: action.kind === "preview",
  });
  useEffect(() => {
    if (state.result) onClose();
  }, [state.result, onClose]);
  const title =
    action.kind === "add"
      ? "Add knowledge source"
      : action.kind === "edit"
        ? "Edit knowledge source"
        : action.kind === "preview"
          ? "Source preview"
          : action.kind === "delete"
            ? "Delete knowledge source"
            : "Reindex knowledge source";
  return (
    <Dialog.Root
      open={true}
      onOpenChange={(open) => {
        if (!open && !state.pending && !state.busy && !preparing) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content knowledge-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            props.onRestoreFocus();
          }}
          onEscapeKeyDown={(e) => {
            if (state.pending || state.busy || preparing) e.preventDefault();
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>
            {action.source?.name ??
              "Choose a source and review its content before saving."}
          </Dialog.Description>
          {action.kind === "preview" ? (
            <>
              <QueryState query={preview}>
                {preview.data && (
                  <>
                    <p className="muted">
                      {action.source?.kind} ·{" "}
                      {preview.data.available
                        ? "Active processed version"
                        : "No processed version available"}
                    </p>
                    {preview.data.excerpts.slice(0, 4).map((text, index) => (
                      <blockquote
                        className="knowledge-excerpt"
                        dir="auto"
                        key={index}
                      >
                        {text.slice(0, 2000)}
                      </blockquote>
                    ))}
                  </>
                )}
              </QueryState>
              <button className="button secondary" onClick={onClose}>
                Close preview
              </button>
            </>
          ) : action.kind === "edit" ? (
            <>
              <QueryState query={detail}>
                {detail.data && <SourceForm {...props} detail={detail.data} />}
              </QueryState>
              {(!detail.data || detail.error) && (
                <div className="form-actions">
                  {!detail.data && (
                    <button className="button secondary" onClick={onClose}>
                      Cancel
                    </button>
                  )}
                  {detail.error && (
                    <button
                      className="button secondary"
                      disabled={detail.isFetching}
                      onClick={() => void detail.refetch()}
                    >
                      Retry source detail
                    </button>
                  )}
                </div>
              )}
            </>
          ) : action.kind === "add" ? (
            <SourceForm {...props} />
          ) : (
            <SourceLifecycle {...props} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function MutationFeedback({ writer }: { writer: KnowledgeWrite }) {
  const state = useSyncExternalStore(writer.subscribe, writer.getSnapshot);
  return (
    <>
      {state.pending && !state.busy && (
        <p className="notice">
          The outcome is unknown. Retry the exact reviewed operation before
          leaving.
        </p>
      )}
      <ErrorSummary error={state.error} />
      {state.error instanceof DashboardError &&
        Object.entries(state.error.fields).map(([field, error]) => (
          <p className="field-error" role="alert" key={field}>
            {error}
          </p>
        ))}
    </>
  );
}
function SourceLifecycle({ agentId, action, writer, onClose }: Props) {
  const state = useSyncExternalStore(writer.subscribe, writer.getSnapshot);
  const [reviewed, setReviewed] = useState(action.source!);
  const auth = useAuth();
  const [error, setError] = useState<unknown>();
  async function reload() {
    try {
      setReviewed(
        await auth.request(
          "GET /dashboard/agents/{agent_id}/knowledge/sources/{source_id}",
          { params: { agent_id: agentId, source_id: reviewed.id } },
        ),
      );
      writer.clear();
      setError(null);
    } catch (e) {
      setError(e);
    }
  }
  return (
    <>
      <p>
        {action.kind === "delete"
          ? "Remove this source from knowledge answers immediately. This does not require publishing the agent draft."
          : "Queue this source for processing. Its previous processed version stays available until a replacement is ready."}
      </p>
      <p className="muted">Reviewed revision {reviewed.revision}</p>
      <MutationFeedback writer={writer} />
      <ErrorSummary error={error} />
      {state.error instanceof DashboardError && state.error.status === 409 && (
        <button className="button secondary" onClick={() => void reload()}>
          Reload revision for review
        </button>
      )}
      <div className="form-actions">
        <button
          className="button secondary"
          disabled={state.pending}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="button"
          disabled={
            state.busy ||
            (state.error instanceof DashboardError &&
              state.error.status === 409)
          }
          onClick={() => {
            if (state.pending) {
              void writer.retry();
              return;
            }
            const params = { agent_id: agentId, source_id: reviewed.id },
              idempotencyKey = crypto.randomUUID();
            void writer.submit(
              action.kind === "delete"
                ? {
                    operation:
                      "DELETE /dashboard/agents/{agent_id}/knowledge/sources/{source_id}",
                    options: {
                      params,
                      query: { revision: reviewed.revision },
                      idempotencyKey,
                    },
                  }
                : {
                    operation:
                      "POST /dashboard/agents/{agent_id}/knowledge/sources/{source_id}/reindex",
                    options: {
                      params,
                      body: { revision: reviewed.revision },
                      idempotencyKey,
                    },
                  },
            );
          }}
        >
          {state.busy
            ? "Applying…"
            : state.pending
              ? "Retry same operation"
              : action.kind === "delete"
                ? "Confirm delete"
                : "Confirm reindex"}
        </button>
      </div>
    </>
  );
}
function SourceForm({
  agentId,
  detail,
  capabilities,
  writer,
  onClose,
  onPreparing,
}: Props & { detail?: SourceDetailOut }) {
  const auth = useAuth();
  const state = useSyncExternalStore(writer.subscribe, writer.getSnapshot);
  const [kind, setKind] = useState<SourceOut["kind"]>(
    detail?.input.kind ?? "text",
  );
  const [name, setName] = useState(detail?.name ?? "");
  const [format, setFormat] = useState<"txt" | "md" | "pdf" | "docx">(
    detail?.input.kind === "text" || detail?.input.kind === "file"
      ? detail.input.format
      : "txt",
  );
  const [text, setText] = useState(
    detail?.input.kind === "text" ? detail.input.text : "",
  );
  const [question, setQuestion] = useState(
    detail?.input.kind === "faq" ? detail.input.question : "",
  );
  const [answer, setAnswer] = useState(
    detail?.input.kind === "faq" ? detail.input.answer : "",
  );
  const [url, setUrl] = useState(
    detail?.input.kind === "url" ? detail.input.url : "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [revision, setRevision] = useState(detail?.revision);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<unknown>();
  const frozen = preparing || state.pending;
  async function reload() {
    try {
      const latest = await auth.request(
        "GET /dashboard/agents/{agent_id}/knowledge/sources/{source_id}",
        { params: { agent_id: agentId, source_id: detail!.id } },
      );
      setRevision(latest.revision);
      writer.clear();
      setError(null);
    } catch (e) {
      setError(e);
    }
  }
  async function submit() {
    if (state.pending) {
      await writer.retry();
      return;
    }
    if (preparing) return;
    setError(null);
    if (!name.trim()) {
      setError("Enter a nonblank source name.");
      return;
    }
    if (
      (kind === "text" && !text.trim()) ||
      (kind === "faq" && (!question.trim() || !answer.trim()))
    ) {
      setError("Enter the source content before saving.");
      return;
    }
    if (kind === "url") {
      try {
        const parsed = new URL(url.trim());
        if (
          parsed.protocol !== "https:" ||
          !parsed.hostname ||
          parsed.username ||
          parsed.password ||
          parsed.hash
        )
          throw Error();
      } catch {
        setError("Use a public HTTPS URL without credentials or a fragment.");
        return;
      }
    }
    const maxBytes = Math.min(
      capabilities?.upload_max_bytes ?? 10485760,
      10485760,
    );
    if (kind === "file" && (!file || !file.size || file.size > maxBytes)) {
      setError(
        `Choose a nonempty file up to ${Math.floor(maxBytes / 1048576)} MiB.`,
      );
      return;
    }
    setPreparing(true);
    onPreparing(true);
    try {
      let command: Command;
      if (kind === "file")
        command = await captureFile(
          agentId,
          name,
          format,
          file!,
          detail && revision ? { id: detail.id, revision } : undefined,
        );
      else {
        const body =
          kind === "text"
            ? {
                kind,
                name: name.trim(),
                text: text.trim(),
                format: format === "md" ? ("md" as const) : ("txt" as const),
              }
            : kind === "faq"
              ? {
                  kind,
                  name: name.trim(),
                  question: question.trim(),
                  answer: answer.trim(),
                }
              : { kind, name: name.trim(), url: url.trim() };
        const options = {
          params: {
            agent_id: agentId,
            ...(detail ? { source_id: detail.id } : {}),
          },
          idempotencyKey: crypto.randomUUID(),
        };
        command =
          detail && revision
            ? {
                operation:
                  "PUT /dashboard/agents/{agent_id}/knowledge/sources/{source_id}",
                options: { ...options, body: { ...body, revision } },
              }
            : {
                operation:
                  "POST /dashboard/agents/{agent_id}/knowledge/sources",
                options: { ...options, body },
              };
      }
      await writer.submit(command);
    } catch (e) {
      setError(e);
    } finally {
      setPreparing(false);
      onPreparing(false);
    }
  }
  return (
    <form
      className="form-field knowledge-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <fieldset disabled={frozen}>
        <legend className="sr-only">Knowledge source content</legend>
        <label htmlFor="source-kind">Source type</label>
        <select
          id="source-kind"
          value={kind}
          disabled={!!detail || frozen}
          onChange={(e) => {
            setKind(e.target.value as SourceOut["kind"]);
            setFormat("txt");
          }}
        >
          <option value="text">Paste text</option>
          <option value="faq">FAQ</option>
          <option value="url">Public URL</option>
          <option value="file">Upload file</option>
        </select>
        <label htmlFor="source-name">Source name</label>
        <input
          id="source-name"
          dir="auto"
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {(kind === "text" || kind === "file") && (
          <>
            <label htmlFor="source-format">Content format</label>
            <select
              id="source-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as typeof format)}
            >
              <option value="txt">Plain text (.txt)</option>
              <option value="md">Markdown (.md)</option>
              {kind === "file" && (
                <>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="docx">Word (.docx)</option>
                </>
              )}
            </select>
          </>
        )}
        {kind === "text" && (
          <>
            <label htmlFor="source-text">Source text</label>
            <textarea
              id="source-text"
              dir="auto"
              maxLength={1000000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </>
        )}
        {kind === "faq" && (
          <>
            <label htmlFor="source-question">Question</label>
            <textarea
              id="source-question"
              dir="auto"
              maxLength={1000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <label htmlFor="source-answer">Answer</label>
            <textarea
              id="source-answer"
              dir="auto"
              maxLength={100000}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </>
        )}
        {kind === "url" && (
          <>
            <label htmlFor="source-url">Public HTTPS URL</label>
            <input
              id="source-url"
              type="url"
              maxLength={2048}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="muted">
              Public pages only. Access and redirects are checked during
              processing.
            </p>
          </>
        )}
        {kind === "file" && (
          <>
            <label htmlFor="source-file">
              {detail ? "Replacement file" : "Source file"}
            </label>
            <input
              id="source-file"
              type="file"
              accept=".txt,.md,.pdf,.docx"
              onChange={(e) => {
                const next = e.target.files?.[0];
                if (next) {
                  setFile(next);
                  const extension = next.name.split(".").at(-1)?.toLowerCase();
                  if (
                    extension === "txt" ||
                    extension === "md" ||
                    extension === "pdf" ||
                    extension === "docx"
                  )
                    setFormat(extension);
                }
              }}
            />
            <p className="muted">
              {file
                ? `Selected: ${file.name} · ${file.size} bytes`
                : "PDF, DOCX, TXT or Markdown · up to 10 MiB."}
              {detail
                ? " Saving a file source requires replacement content, including name changes."
                : ""}
            </p>
          </>
        )}
      </fieldset>
      <p className="muted">
        {revision ? `Reviewed revision ${revision}. ` : ""}Processed knowledge
        updates become available without Publish.
      </p>
      <ErrorSummary error={error} />
      <MutationFeedback writer={writer} />
      {state.error instanceof DashboardError &&
        state.error.status === 409 &&
        detail && (
          <button
            type="button"
            className="button secondary"
            onClick={() => void reload()}
          >
            Reload revision, keep my input
          </button>
        )}
      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          disabled={frozen}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="button"
          disabled={
            preparing ||
            state.busy ||
            (state.error instanceof DashboardError &&
              state.error.status === 409)
          }
        >
          {preparing || state.busy
            ? "Saving…"
            : state.pending
              ? "Retry same operation"
              : "Save source"}
        </button>
      </div>
    </form>
  );
}
