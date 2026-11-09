import type { VoiceCreate, VoiceSnapshot } from "./voice.generated";
import {
  fetchResponse,
  isRecord,
  readErrorBody,
  readResponseJson,
  retryAfter,
  safeFailure,
} from "./errors";
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
  readonly code: string;
  constructor(
    readonly status: number,
    rawCode?: unknown,
    readonly retryAfterSeconds?: number,
  ) {
    const { code, message } = safeFailure(status, rawCode, retryAfterSeconds);
    super(message);
    this.code = code;
  }
}
export async function request<T>(
  path: string,
  token?: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetchResponse(`${API_URL}${path}`, {
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
    const errorBody = await readErrorBody(response, 2 * 1024, signal);
    const code = isRecord(errorBody?.error)
      ? errorBody.error.code
      : errorBody?.detail === "voice_urdu_unavailable"
        ? errorBody.detail
        : undefined;
    throw new ApiError(response.status, code, retryAfter(response));
  }
  return readResponseJson<T>(response, signal);
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
