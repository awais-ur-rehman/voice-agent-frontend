import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import type { VoiceSnapshot } from "../api/voice.generated";
import { Button } from "../components/ui/button";
import {
  createLiveMedia,
  type MediaConnection,
  type MediaEvents,
  type MediaState,
} from "../features/voice/media";
type Factory = (events: MediaEvents) => MediaConnection;
const labels: Record<MediaState, string> = {
  connecting: "Connecting",
  connected: "Media connected",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  disconnected: "Connection interrupted",
  error: "Pipeline error",
};
const explanations: Record<MediaState, string> = {
  connecting: "Requesting microphone and connecting to the room.",
  connected:
    "Waiting for the voice worker. Speech is not ready until the worker reports its state.",
  listening: "The worker is ready for your voice.",
  thinking:
    "The worker is processing your turn. CPU inference can take longer.",
  speaking: "The worker is sending audio. You can interrupt by speaking.",
  disconnected:
    "Playback was stopped. Reconnect within the session grace period.",
  error: "The voice pipeline cannot continue this turn.",
};
function errorMessage(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError"
    ? "Microphone access was denied. Allow microphone access in your browser, then start again."
    : error instanceof Error
      ? error.message
      : "The connection failed. Try again.";
}
export function App({
  createMedia = createLiveMedia,
}: {
  createMedia?: Factory;
}) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null),
    [agent, setAgent] = useState(""),
    [session, setSession] = useState<VoiceSnapshot | null>(null),
    [status, setStatus] = useState<MediaState | null>(null),
    [error, setError] = useState(""),
    [muted, setMuted] = useState(false),
    [blocked, setBlocked] = useState(false),
    [captions, setCaptions] = useState(false),
    [caption, setCaption] = useState<{
      text: string;
      lang: "en" | "ur";
    } | null>(null),
    [connectMs, setConnectMs] = useState<number | null>(null),
    [ended, setEnded] = useState(false);
  const media = useRef<MediaConnection | null>(null),
    sessionRef = useRef<VoiceSnapshot | null>(null),
    tokenRef = useRef<string | null>(null),
    operation = useRef(0),
    captionsRef = useRef(false),
    pendingRequest = useRef<{ agent_id: string; request_key: string } | null>(
      null,
    );
  tokenRef.current = token;
  sessionRef.current = session;
  captionsRef.current = captions;
  useEffect(
    () => () => {
      operation.current++;
      void media.current?.disconnect();
      const s = sessionRef.current,
        t = tokenRef.current;
      if (s && t) void api.end(t, s.session_id).catch(() => {});
    },
    [],
  );
  const agents = useQuery({
    queryKey: ["voice-agents", token],
    queryFn: ({ signal }) => api.agents(token!, signal),
    enabled: !!token,
    staleTime: 30000,
    retry: false,
  });
  function reportError(e: unknown) {
    setError(errorMessage(e));
    if (e instanceof ApiError && e.status === 401) {
      // Fence outstanding results before another account can sign in. Cleanup
      // with an expired capability is best effort; it cannot bind the next user.
      operation.current++;
      const oldMedia = media.current;
      media.current = null;
      void Promise.resolve(oldMedia?.disconnect()).catch(() => {});
      tokenRef.current = null;
      sessionRef.current = null;
      pendingRequest.current = null;
      setSession(null);
      setAgent("");
      setCaption(null);
      setCaptions(false);
      setMuted(false);
      setBlocked(false);
      setConnectMs(null);
      setStatus(null);
      setEnded(false);
      setToken(null);
      queryClient.removeQueries({ queryKey: ["voice-agents"] });
    }
  }
  const signIn = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (data) => {
      setToken(data.access_token);
      setError("");
    },
    onError: reportError,
  });
  async function cleanup() {
    const current = media.current;
    media.current = null;
    await current?.disconnect();
    setCaption(null);
    setBlocked(false);
    setMuted(false);
  }
  const call = useMutation({
    mutationFn: async (resume: boolean) => {
      if (!token) throw Error("Sign in first.");
      const own = ++operation.current;
      setError("");
      setEnded(false);
      setStatus("connecting");
      setConnectMs(null);
      await cleanup();
      let next: VoiceSnapshot | undefined;
      try {
        if (resume && session)
          next = await api.resume(token, session.session_id);
        else {
          const selected = agent || agents.data?.agents[0]?.id;
          if (!selected) throw Error("Select an enabled agent.");
          if (pendingRequest.current?.agent_id !== selected)
            pendingRequest.current = {
              agent_id: selected,
              request_key: crypto.randomUUID(),
            };
          next = await api.start(token, pendingRequest.current);
        }
        if (own !== operation.current) {
          await api.end(token, next.session_id);
          return;
        }
        setSession(next);
        sessionRef.current = next;
        if (next.status !== "active" || !next.media)
          throw Error(
            next.status === "ended"
              ? "This session has ended. Start a new session."
              : "The voice pipeline is unavailable. End this session and check the worker.",
          );
        if (
          next.media.session_id !== next.session_id ||
          next.media.generation !== next.generation ||
          Date.parse(next.media.expires_at) <= Date.now()
        )
          throw Error(
            "The media grant is stale or does not match this session. Reconnect to request a fresh grant.",
          );
        const current = createMedia({
          state: (s) => {
            if (own === operation.current) setStatus(s);
          },
          caption: (text, lang) => {
            if (own === operation.current && captionsRef.current)
              setCaption({ text, lang });
          },
          audioBlocked: () => {
            if (own === operation.current) setBlocked(true);
          },
          error: (m) => {
            if (own === operation.current) {
              setError(m);
              setStatus("error");
            }
          },
        });
        media.current = current;
        const started = performance.now();
        await current.connect(next.media);
        if (own !== operation.current) {
          await current.disconnect();
          return;
        }
        setStatus((s) => (s === "connecting" ? "connected" : s));
        setConnectMs(Math.round(performance.now() - started));
        pendingRequest.current = null;
      } catch (e) {
        await cleanup();
        if (own === operation.current) {
          reportError(e);
          setStatus("error");
          if (next) {
            try {
              await api.end(token, next.session_id);
              setSession(null);
              sessionRef.current = null;
              pendingRequest.current = null;
            } catch {
              setError(
                `${errorMessage(e)} Session cleanup could not be confirmed. Use End session to retry.`,
              );
            }
          }
        }
        throw e;
      }
    },
    onError: () => {},
  });
  const end = useMutation({
    mutationFn: async () => {
      operation.current++;
      await cleanup();
      if (token && session) {
        const result = await api.end(token, session.session_id);
        if (result.status !== "ended")
          throw Error("Session end was not confirmed. Retry End session.");
      }
      setSession(null);
      sessionRef.current = null;
      pendingRequest.current = null;
      setStatus(null);
      setEnded(true);
      setError("");
    },
    onError: (e) => {
      reportError(e);
      setStatus("error");
    },
  });
  const mic = useMutation({
    mutationFn: async () => {
      await media.current?.setMuted(!muted);
      setMuted(!muted);
      setCaption(null);
    },
    onError: reportError,
  });
  const playback = useMutation({
    mutationFn: async () => {
      await media.current?.enableAudio();
      setBlocked(false);
    },
    onError: reportError,
  });
  const busy = call.isPending || end.isPending;
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Clinic voice console">
          <span className="brand-mark" aria-hidden="true">
            c
          </span>{" "}
          clinic
          <span className="brand-divider" />
          Voice console
        </a>
        <span className="checkpoint">
          CPU checkpoint <span aria-hidden="true">↗</span>
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">VOICE / PHASE 03</p>
            <h1>A conversation starts here.</h1>
            <p className="intro">
              A browser checkpoint for the clinic voice assistant.
            </p>
          </div>
          <span className="local-tag">
            <span />
            Local development
          </span>
        </div>
        <div className="console-layout">
          <section className="session-panel" aria-labelledby="session-heading">
            <div className="section-title">
              <span className="step">01</span>
              <h2 id="session-heading">
                {token ? "Your session" : "Staff access"}
              </h2>
              {token ? (
                <Button
                  variant="ghost"
                  disabled={!!session || busy}
                  onClick={() => {
                    setToken(null);
                    queryClient.clear();
                    setCaption(null);
                    setEnded(false);
                  }}
                >
                  Sign out
                </Button>
              ) : (
                <span className="access-label">STAFF ONLY</span>
              )}
            </div>
            {!token ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget,
                    data = new FormData(form);
                  setError("");
                  signIn.mutate({
                    email: String(data.get("email")),
                    password: String(data.get("password")),
                  });
                  form.reset();
                }}
              >
                <p className="form-description">
                  Sign in with your existing clinic account to select a
                  published agent.
                </p>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="you@clinic.example"
                />
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
                <Button className="full-width" disabled={signIn.isPending}>
                  {signIn.isPending ? "Signing in…" : "Sign in"}
                  <span aria-hidden="true">→</span>
                </Button>
              </form>
            ) : (
              <>
                <label htmlFor="agent">Published agent</label>
                <select
                  id="agent"
                  value={agent || agents.data?.agents[0]?.id || ""}
                  onChange={(event) => setAgent(event.target.value)}
                  disabled={!!session || busy || agents.isPending}
                >
                  {agents.isPending ? (
                    <option>Loading agents…</option>
                  ) : !agents.data?.agents.length ? (
                    <option>No enabled agents</option>
                  ) : (
                    agents.data.agents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  )}
                </select>
                {agents.isError ? (
                  <div role="alert" className="inline-error">
                    {errorMessage(agents.error)}{" "}
                    <Button
                      variant="ghost"
                      onClick={() => void agents.refetch()}
                    >
                      Retry agents
                    </Button>
                  </div>
                ) : null}
                <div className="agent-language">
                  {agents.data?.agents.find(
                    (item) => item.id === (agent || agents.data.agents[0]?.id),
                  )?.language_mode ?? "No agent available"}
                  <span>Microphone audio only</span>
                </div>
                <div className={`voice-stage ${status ?? "idle"}`}>
                  <div className="signal" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className="stage-status" role="status" aria-live="polite">
                    {muted
                      ? "Microphone muted"
                      : status
                        ? labels[status]
                        : ended
                          ? "Session ended"
                          : "Ready when you are"}
                  </p>
                  <p className="stage-description">
                    {muted
                      ? "Unmute when you are ready to speak."
                      : status
                        ? explanations[status]
                        : "Start a session and allow your browser to use the microphone."}
                  </p>
                </div>
                <div className="call-controls">
                  {!session ? (
                    <Button
                      disabled={busy || !agents.data?.agents.length}
                      onClick={() => call.mutate(false)}
                    >
                      {call.isPending ? "Connecting…" : "Start voice session"}
                      <span aria-hidden="true">↗</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        disabled={
                          busy ||
                          mic.isPending ||
                          status === "disconnected" ||
                          status === "error"
                        }
                        onClick={() => mic.mutate()}
                      >
                        {muted ? "Unmute microphone" : "Mute microphone"}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={end.isPending}
                        onClick={() => end.mutate()}
                      >
                        End session
                      </Button>
                      {status === "disconnected" || status === "error" ? (
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => call.mutate(true)}
                        >
                          Reconnect
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
                {blocked ? (
                  <div className="notice" role="alert">
                    <strong>Browser sound is blocked.</strong>
                    <p>
                      Allow playback to hear the assistant. No speech is marked
                      delivered while playback is blocked.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => playback.mutate()}
                      disabled={playback.isPending}
                    >
                      Enable audio
                    </Button>
                  </div>
                ) : null}
                <div className="caption-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={captions}
                      onChange={(event) => {
                        setCaptions(event.target.checked);
                        if (!event.target.checked) setCaption(null);
                      }}
                    />
                    Show live captions
                  </label>
                  <span>Only for this session</span>
                </div>
                {captions ? (
                  <div
                    className="captions"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {caption ? (
                      <p dir="auto" lang={caption.lang}>
                        {caption.text}
                      </p>
                    ) : (
                      <p className="caption-placeholder">
                        Captions appear here when the worker sends speech text.
                      </p>
                    )}
                  </div>
                ) : null}
              </>
            )}
            {error ? (
              <div className="inline-error" role="alert">
                {error}
              </div>
            ) : null}
          </section>
          <aside className="guide-panel">
            <p className="eyebrow">BEFORE YOU BEGIN</p>
            <h2>
              Real audio.
              <br />A careful checkpoint.
            </h2>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>Use synthetic details</h3>
                  <p>
                    Test with development patients. Audio and captions stay out
                    of browser storage.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Allow microphone & sound</h3>
                  <p>
                    Use headphones for clearer speech and fewer interruptions
                    from speaker echo.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Listen, then confirm</h3>
                  <p>
                    Let the assistant finish the full readback before saying
                    yes. Speaking over it interrupts delivery.
                  </p>
                </div>
              </li>
            </ol>
            <div className="measurement">
              <span className="measurement-label">MEDIA CONNECTION</span>
              <strong>
                {connectMs === null
                  ? "Not measured"
                  : `${connectMs.toLocaleString()} ms`}
              </strong>
              <p>
                {connectMs === null
                  ? "Measured after a real room and microphone connection."
                  : "Browser room + microphone connection time. This is not speech response latency."}
              </p>
            </div>
            <p className="cpu-note">
              Urdu synthesis is blocked by the current CPU memory gate. GPU
              latency and native voice quality acceptance remain pending.
            </p>
          </aside>
        </div>
        <footer>
          <span>
            Private by default. Credentials and captions stay in memory.
          </span>
          <span>
            English /{" "}
            <span lang="ur" className="urdu">
              اردو
            </span>
          </span>
        </footer>
      </main>
    </div>
  );
}
