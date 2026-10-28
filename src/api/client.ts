import type { VoiceCreate, VoiceSnapshot } from "./voice.generated";
const raw = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const url = new URL(raw);
if (
  !["http:", "https:"].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
)
  throw Error(
    "VITE_API_URL must be a public HTTP API origin without credentials.",
  );
export const API_URL = url.href.replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    readonly status: number,
    code?: string,
  ) {
    super(
      code === "voice_urdu_unavailable"
        ? "Urdu synthesis is unavailable on this CPU profile. The model memory gate is blocked; Urdu voice acceptance is pending."
        : status === 401
          ? "Sign-in expired or credentials rejected. Sign in again."
          : status === 429 || status === 409
            ? "The voice worker is busy. Try again shortly."
            : status === 503
              ? "The speech pipeline is unavailable. Check the CPU worker and model setup."
              : status === 403
                ? "This staff account cannot access that resource."
                : "The request could not be completed. Try again.",
    );
  }
}
export async function request<T>(
  path: string,
  token?: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(signal ? { signal } : {}),
    cache: "no-store",
    credentials: "omit",
  });
  if (!response.ok) {
    let code: string | undefined;
    try {
      const text = await response.text();
      if (text.length <= 2048) {
        const body: unknown = JSON.parse(text);
        if (body && typeof body === "object" && !Array.isArray(body)) {
          const detail = (body as Record<string, unknown>).detail;
          if (detail === "voice_urdu_unavailable") code = detail;
        }
      }
    } catch {
      /* Never display an untrusted server body. */
    }
    throw new ApiError(response.status, code);
  }
  return response.json() as Promise<T>;
}
export type Agent = { id: string; name: string; language_mode: string };
export const api = {
  login: (email: string, password: string) =>
    request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>("/auth/login", undefined, { email, password }),
  agents: (token: string, signal: AbortSignal) =>
    request<{ agents: Agent[] }>("/voice/agents", token, undefined, signal),
  start: (token: string, body: VoiceCreate) =>
    request<VoiceSnapshot>("/voice/sessions", token, body),
  resume: (token: string, id: string) =>
    request<VoiceSnapshot>(
      `/voice/sessions/${encodeURIComponent(id)}/resume`,
      token,
      {},
    ),
  end: (token: string, id: string) =>
    request<VoiceSnapshot>(
      `/voice/sessions/${encodeURIComponent(id)}/end`,
      token,
      {},
    ),
};
