import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth, useSessionKey } from "../../app/auth";
import { ErrorSummary } from "../../components/ui/patterns";
import { useDashboardQuery } from "../clinic/ClinicPages";
import { ReadState, Usage } from "./charts";
import { label, ms, privacyCopy, utc, offsetLabel } from "./presentation";
export function CallDetail() {
  const { identity = "" } = useParams();
  const auth = useAuth();
  return (
    <DetailWorkspace
      key={`${auth.sessionId}:${identity}`}
      identity={identity}
    />
  );
}
function DetailWorkspace({ identity }: { identity: string }) {
  const auth = useAuth();
  const location = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const [after, setAfter] = useState<number | undefined>(),
    [measurementAfter, setMeasurementAfter] = useState<string | undefined>(),
    [showText, setShowText] = useState(false);
  const detail = useDashboardQuery("GET /dashboard/calls/{session_id}", {
    params: { session_id: identity },
    query: { limit: 25, after, measurement_after: measurementAfter },
  });
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const back =
    typeof location.state?.back === "string" &&
    /^\/calls(?:\?|$)/.test(location.state.back)
      ? location.state.back
      : "/calls";
  const d = detail.data;
  return (
    <div className="analytics-workspace">
      <Link
        className="button secondary"
        to={back}
        state={{ focus: location.state?.focus }}
      >
        Back to calls
      </Link>
      <h1 ref={heading} tabIndex={-1}>
        Session review
      </h1>
      <ReadState query={detail}>
        {d ? (
          <>
            <section className="panel">
              <h2>Session facts</h2>
              <dl className="session-facts">
                <div>
                  <dt>Channel / language</dt>
                  <dd>
                    {label(d.call.channel)} · {label(d.call.language)}
                  </dd>
                </div>
                <div>
                  <dt>Outcome</dt>
                  <dd>
                    {d.call.outcome
                      ? label(d.call.outcome)
                      : label(d.call.status)}
                  </dd>
                </div>
                <div>
                  <dt>Ended by</dt>
                  <dd>
                    {d.call.end_reason ? label(d.call.end_reason) : "Not ended"}
                    {d.call.pending_expiry ? " · expiry pending" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Tasks completed / attempted</dt>
                  <dd>
                    {d.completed_tasks} / {d.attempted_tasks}
                  </dd>
                </div>
                <div>
                  <dt>Started</dt>
                  <dd>{utc(d.call.started_at)}</dd>
                </div>
                <div>
                  <dt>Ended</dt>
                  <dd>{utc(d.call.ended_at)}</dd>
                </div>
                <div>
                  <dt>Session timezone</dt>
                  <dd>
                    {d.call.timezone} · {offsetLabel(d.call.utc_offset_minutes)}
                  </dd>
                </div>
                <div>
                  <dt>Local admission date</dt>
                  <dd>{d.call.local_date}</dd>
                </div>
              </dl>
              <p>{d.summary}</p>
              <p>
                {Object.entries(d.operations)
                  .map(([name, count]) => `${label(name)}: ${count}`)
                  .join(" · ") || "No operations"}{" "}
                · Review flags:{" "}
                {d.call.quality_flags.map(label).join(", ") || "None"}
              </p>
              <details className="analytics-help">
                <summary>Diagnostics</summary>
                <p className="opaque-id">Session {d.call.session_id}</p>
                <p className="opaque-id">Correlation UUID: {d.trace_id}</p>
                <p>
                  Summary reflects the facts at this read. Event numbers
                  preserve recorded order. Measurements refer to their actual
                  turn event, which may appear on another page; unassociated
                  measurements have no recorded turn link.
                </p>
              </details>
              <Usage value={d.usage} />
            </section>
            <section className="panel">
              <h2>Session activity</h2>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Scrollable data table"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Event no.</th>
                      <th>Event</th>
                      <th>Tool / result</th>
                      <th>Observed (UTC)</th>
                      <th>Language</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.events.items.map((e) => (
                      <tr key={e.ordinal}>
                        <td>{e.ordinal}</td>
                        <td>{label(e.kind)}</td>
                        <td>
                          {e.tool_name ? label(e.tool_name) : "—"}
                          {e.tool_status ? ` · ${label(e.tool_status)}` : ""}
                        </td>
                        <td>{utc(e.occurred_at)}</td>
                        <td>{label(e.language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!d.events.items.length ? (
                <p>No safe events on this page.</p>
              ) : null}
              <div className="pagination">
                <button
                  className="button secondary"
                  disabled={after === undefined}
                  onClick={() => setAfter(undefined)}
                >
                  First events
                </button>
                <span>
                  {d.events.items.length} on page · {d.events.total} events
                </span>
                <button
                  className="button secondary"
                  disabled={!d.events.has_more}
                  onClick={() => setAfter(d.events.next_cursor ?? undefined)}
                >
                  Next events
                </button>
              </div>
            </section>
            <section className="panel">
              <h2>Per-turn measured stages</h2>

              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Scrollable data table"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Turn event</th>
                      <th>Stage</th>
                      <th>Duration</th>
                      <th>Origin / language</th>
                      <th>Observed (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.measurements.items.map((m) => (
                      <tr key={m.id}>
                        <td>{m.turn_ordinal ?? "Unassociated"}</td>
                        <td>
                          {label(m.stage)}
                          {[
                            "tts_buffered_generation",
                            "audio_queue",
                            "end_of_speech_to_audio_queue",
                          ].includes(m.stage)
                            ? " · diagnostic"
                            : ""}
                        </td>
                        <td>{ms(m.duration_ms)}</td>
                        <td>
                          {label(m.origin)} · {label(m.language)}
                        </td>
                        <td>{utc(m.observed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!d.measurements.items.length ? (
                <p>No measurements on this page.</p>
              ) : null}
              <div className="pagination">
                <button
                  className="button secondary"
                  disabled={!measurementAfter}
                  onClick={() => setMeasurementAfter(undefined)}
                >
                  First measurements
                </button>
                <span>
                  {d.measurements.items.length} on page · {d.measurements.total}{" "}
                  measurements
                </span>
                <button
                  className="button secondary"
                  disabled={!d.measurements.has_more}
                  onClick={() =>
                    setMeasurementAfter(d.measurements.next_cursor ?? undefined)
                  }
                >
                  Next measurements
                </button>
              </div>
            </section>
            <section className="panel analytics-privacy">
              <h2>Transcript</h2>
              {auth.isManager ? (
                <>
                  {!showText ? (
                    <button
                      className="button secondary"
                      onClick={() => setShowText(true)}
                    >
                      Check protected transcript
                    </button>
                  ) : (
                    <Transcript
                      identity={identity}
                      onClose={() => setShowText(false)}
                    />
                  )}
                </>
              ) : (
                <>
                  <p>Transcript access is limited to owners and admins.</p>
                  <p>{privacyCopy[d.privacy.reason]}</p>
                </>
              )}
            </section>
          </>
        ) : null}
      </ReadState>
    </div>
  );
}
function Transcript({
  identity,
  onClose,
}: {
  identity: string;
  onClose: () => void;
}) {
  const auth = useAuth(),
    client = useQueryClient();
  const deleteTrigger = useRef<HTMLButtonElement>(null),
    closeTrigger = useRef<HTMLButtonElement>(null);
  const key = useSessionKey(
    "GET /dashboard/calls/{session_id}/transcript",
    identity,
  );
  const scope = useSessionKey();
  const [after, setAfter] = useState<number | undefined>(),
    [hidden, setHidden] = useState(false),
    [deleted, setDeleted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: [...key, after],
    queryFn: ({ signal }) =>
      auth.request("GET /dashboard/calls/{session_id}/transcript", {
        params: { session_id: identity },
        query: { limit: 25, after },
        signal,
      }),
    enabled: auth.isManager && !hidden,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  useEffect(
    () => () => {
      void client.cancelQueries({ queryKey: key });
      client.removeQueries({ queryKey: key });
    },
    [client, identity, auth.sessionId],
  ); // scope is stable by primitive identity
  async function remove() {
    setHidden(true);
    setBusy(true);
    setError(null);
    setConfirm(false);
    await client.cancelQueries({ queryKey: key });
    client.removeQueries({ queryKey: key });
    try {
      await auth.request("DELETE /dashboard/calls/{session_id}/transcript", {
        params: { session_id: identity },
      });
      setDeleted(true);
      await client.invalidateQueries({
        queryKey: scope,
        predicate: (q) =>
          q.queryKey.includes("GET /dashboard/calls/{session_id}"),
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="protected-transcript">
      <p>
        Redaction can leave sensitive information. Review only for authorized
        clinic work.
      </p>
      <ErrorSummary error={error} />
      {hidden ? (
        <p role="status">
          {deleted
            ? privacyCopy.deleted
            : busy
              ? "Deleting transcript…"
              : "Text hidden. Deletion could not be confirmed. Check current server state before continuing."}
        </p>
      ) : (
        <ReadState query={query}>
          {query.data ? (
            <>
              <p role="status">{privacyCopy[query.data.privacy.reason]}</p>
              {query.data.privacy.reason === "available" ? (
                <>
                  <ol className="analytics-transcript">
                    {query.data.items.map((t) => (
                      <li key={t.ordinal}>
                        <div>
                          <strong>{label(t.speaker)}</strong> · event{" "}
                          {t.ordinal} · {utc(t.occurred_at)}
                        </div>
                        <p dir="auto">{t.text}</p>
                      </li>
                    ))}
                  </ol>
                  <div className="pagination">
                    <button
                      className="button secondary"
                      disabled={after === undefined}
                      onClick={() => setAfter(undefined)}
                    >
                      First text page
                    </button>
                    <span>
                      {query.data.items.length} on page · {query.data.total}{" "}
                      retained messages
                    </span>
                    <button
                      className="button secondary"
                      disabled={!query.data.has_more}
                      onClick={() =>
                        setAfter(query.data!.next_cursor ?? undefined)
                      }
                    >
                      Next text page
                    </button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </ReadState>
      )}
      <div className="form-actions">
        <button
          ref={closeTrigger}
          className="button secondary"
          onClick={onClose}
        >
          Close protected transcript
        </button>
        {hidden && !busy && !deleted ? (
          <button
            className="button secondary"
            onClick={() => {
              setAfter(undefined);
              setHidden(false);
              setError(null);
            }}
          >
            Check current transcript state
          </button>
        ) : null}
        {!deleted ? (
          <button
            className="button secondary"
            disabled={busy}
            ref={deleteTrigger}
            onClick={() => setConfirm(true)}
          >
            Delete transcript
          </button>
        ) : null}
      </div>
      <Dialog.Root open={confirm} onOpenChange={setConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content analytics-dialog"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              (busy ? closeTrigger : deleteTrigger).current?.focus();
            }}
          >
            <Dialog.Title>Delete retained transcript?</Dialog.Title>
            <Dialog.Description>
              This permanently tombstones this session’s text. Capture cannot
              restore it. Metadata and aggregate counts remain; no promise is
              made about copies outside this system.
            </Dialog.Description>
            <div className="form-actions">
              <Dialog.Close asChild>
                <button className="button secondary">Cancel</button>
              </Dialog.Close>
              <button className="button" onClick={() => void remove()}>
                Confirm transcript deletion
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
