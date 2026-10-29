import { useEffect, useState, useSyncExternalStore } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { useAuth } from "../../app/auth";
import { ErrorSummary, StatusBadge } from "../../components/ui/patterns";
import { IsolatedTest } from "./isolated-test";
function Activity({ busy, listening }: { busy: boolean; listening: boolean }) {
  const [reduced, setReduced] = useState(() =>
    typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)").matches
      : true,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return (
    <ThinkingOrb
      size={32}
      theme="light"
      color="#345edf"
      state={listening ? "listening" : "working"}
      paused={reduced || (!busy && !listening)}
      aria-hidden="true"
    />
  );
}
export function TestPanel({
  agentId,
  revision,
  disabled,
  onActive,
}: {
  agentId: string;
  revision: number;
  disabled: boolean;
  onActive?: (active: boolean) => void;
}) {
  const auth = useAuth();
  const [controller] = useState(
    () => new IsolatedTest(auth.request, auth.registerCleanup),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [text, setText] = useState("");
  const snapshot = state.snapshot,
    active = snapshot?.status === "active";
  useEffect(() => {
    controller.mount();
    return () => controller.dispose();
  }, [controller]);
  useEffect(() => {
    onActive?.(!!active || state.busy);
  }, [active, state.busy, onActive]);
  useEffect(() => {
    if (!active || !snapshot) return;
    const timer = window.setTimeout(
      () => controller.expire(),
      Math.min(
        2147483647,
        Math.max(0, Date.parse(snapshot.expires_at) - Date.now()),
      ),
    );
    return () => clearTimeout(timer);
  }, [active, snapshot, controller]);
  return (
    <aside className="panel agent-test" aria-labelledby="test-title">
      <div className="agent-test-heading">
        <Activity
          busy={state.busy || state.mediaState === "thinking"}
          listening={state.mediaState === "listening" && !state.muted}
        />
        <div>
          <h2 id="test-title">Isolated test clinic</h2>
          <StatusBadge>
            {active ? "Test active" : (snapshot?.status ?? "Not started")}
          </StatusBadge>
        </div>
      </div>
      <p>
        Changes affect synthetic test records only. Real patients and bookings
        are never copied.
      </p>
      {disabled && (
        <p className="notice">Save your edits before starting a new test.</p>
      )}
      {!active ? (
        <button
          className="button"
          disabled={disabled || state.busy}
          onClick={() => void controller.start(agentId, revision)}
        >
          Start isolated test
        </button>
      ) : (
        <>
          <p className="muted">
            Tested draft revision {snapshot.draft_revision} · Expires{" "}
            {new Date(snapshot.expires_at).toLocaleTimeString()}
          </p>
          <details className="test-fixtures">
            <summary>Synthetic test records</summary>
            {snapshot.fixtures.patients.map((patient) => (
              <p key={patient.id} dir="auto">
                {patient.name} · <bdi dir="ltr">{patient.phone}</bdi>
                {patient.dob ? ` · ${patient.dob}` : ""}
              </p>
            ))}
            {snapshot.fixtures.appointment ? (
              <p>
                Test appointment:{" "}
                {new Date(
                  snapshot.fixtures.appointment.starts_at,
                ).toLocaleString()}
              </p>
            ) : (
              <p>
                {snapshot.fixtures.appointment_unavailable_reason ??
                  "No test appointment created."}
              </p>
            )}
          </details>
          <div
            className="test-messages"
            role="log"
            aria-label="Test conversation"
          >
            {snapshot.conversation.messages.length ? (
              snapshot.conversation.messages.map((message, index) => (
                <p key={index} dir="auto">
                  <strong>{message.role ?? "Assistant"}</strong>
                  <br />
                  {message.text}
                </p>
              ))
            ) : (
              <p className="muted">Send a message to test the saved draft.</p>
            )}
          </div>
          <form
            className="form-field"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) void controller.turn(text.trim());
            }}
          >
            <label htmlFor="test-message">Test message</label>
            <textarea
              id="test-message"
              dir="auto"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={state.busy || state.pendingTurn || state.pendingEnd}
              maxLength={4000}
              required
            />
            <div className="form-actions">
              <button
                className="button"
                disabled={
                  state.busy ||
                  state.pendingEnd ||
                  !snapshot.transport_capabilities.text.available ||
                  !text.trim()
                }
              >
                {state.busy
                  ? "Working…"
                  : state.pendingTurn
                    ? "Retry same turn"
                    : "Send test message"}
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={state.busy}
                onClick={() => void controller.end()}
              >
                End test
              </button>
            </div>
          </form>
          {state.trace.length > 0 && (
            <details>
              <summary>Redacted tool decisions</summary>
              <ul>
                {state.trace.map((trace, index) => (
                  <li key={index}>
                    {trace.action} · {trace.code} ·{" "}
                    {trace.ok ? "Succeeded" : "Not completed"}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="test-speech">
            <h3>Speech</h3>
            <p>
              {snapshot.transport_capabilities.voice.available
                ? "Native speech is admitted for this test."
                : "Speech is unavailable. You can continue testing with text."}
            </p>
            <button
              className="button secondary"
              disabled={
                state.busy ||
                state.pendingEnd ||
                !snapshot.transport_capabilities.voice.available
              }
              onClick={() => void controller.voice()}
            >
              Start voice
            </button>
            {state.mediaState && (
              <>
                <p role="status">
                  {state.muted
                    ? "Microphone muted"
                    : state.mediaState === "connected"
                      ? "Media connected · waiting for worker"
                      : state.mediaState}
                </p>
                <div className="form-actions">
                  <button
                    className="button secondary"
                    disabled={state.busy}
                    onClick={() => void controller.mute()}
                  >
                    {state.muted ? "Unmute microphone" : "Mute microphone"}
                  </button>
                  {["error", "disconnected"].includes(state.mediaState) && (
                    <button
                      className="button secondary"
                      disabled={state.busy}
                      onClick={() => void controller.voice(true)}
                    >
                      Reconnect
                    </button>
                  )}
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={state.showCaptions}
                    onChange={(e) => controller.captions(e.target.checked)}
                  />
                  Show live captions
                </label>
                {state.showCaptions && (
                  <p aria-live="polite" dir="auto" lang={state.caption?.lang}>
                    {state.caption?.text ??
                      "Captions appear when the worker sends speech text."}
                  </p>
                )}
              </>
            )}
            {state.audioBlocked && (
              <div className="notice">
                <p>
                  Browser sound is blocked. No speech is marked delivered while
                  playback is blocked.
                </p>
                <button
                  className="button secondary"
                  onClick={() => void controller.enableAudio()}
                >
                  Enable audio
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <ErrorSummary error={state.error} />
    </aside>
  );
}
