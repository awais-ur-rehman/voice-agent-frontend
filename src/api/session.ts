import {
  DashboardError,
  http,
  type Operation,
  type RequestOptions,
  type Result,
} from "./dashboard";
import type { Login, Register, Tokens, Me } from "./dashboard.generated";
export type SessionSnapshot = { me: Me | null; sessionId: string };
const aborted = () =>
  new DOMException("This session is no longer active.", "AbortError");
export class Session {
  private tokens: Tokens | null = null;
  private generation = 0;
  private controller = new AbortController();
  private refreshPromise: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private cleanups = new Set<() => void | Promise<void>>();
  snapshot: SessionSnapshot = { me: null, sessionId: crypto.randomUUID() };
  constructor(private clearCache: () => void) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  registerCleanup = (cleanup: () => void | Promise<void>) => {
    this.cleanups.add(cleanup);
    return () => {
      this.cleanups.delete(cleanup);
    };
  };
  private emit() {
    for (const listener of this.listeners) listener();
  }
  private reset() {
    this.generation++;
    this.controller.abort();
    this.controller = new AbortController();
    this.tokens = null;
    this.refreshPromise = null;
    this.clearCache();
    for (const cleanup of this.cleanups) {
      try {
        void Promise.resolve(cleanup()).catch(() => {});
      } catch {
        /* Cleanup failures cannot retain a signed-out identity. */
      }
    }
    this.cleanups.clear();
    this.snapshot = { me: null, sessionId: crypto.randomUUID() };
    this.emit();
  }
  login = (body: Login) => this.authenticate("POST /auth/login", body);
  register = (body: Register) => this.authenticate("POST /auth/register", body);
  private async authenticate(
    operation: "POST /auth/login" | "POST /auth/register",
    body: Login | Register,
  ) {
    this.reset();
    const generation = this.generation;
    const signal = this.controller.signal;
    const tokens = await http(operation, { body, signal });
    if (generation !== this.generation) throw aborted();
    this.tokens = tokens;
    try {
      const me = await this.request("GET /auth/me");
      if (generation !== this.generation) throw aborted();
      this.snapshot = { me, sessionId: this.snapshot.sessionId };
      this.emit();
    } catch (error) {
      if (generation === this.generation) this.reset();
      throw error;
    }
  }
  private async refresh(generation: number) {
    if (!this.refreshPromise) {
      const refreshToken = this.tokens?.refresh_token;
      if (!refreshToken) throw aborted();
      this.refreshPromise = (async () => {
        try {
          const tokens = await http("POST /auth/refresh", {
            body: { refresh_token: refreshToken },
            signal: this.controller.signal,
          });
          if (generation !== this.generation) throw aborted();
          this.tokens = tokens;
        } catch (error) {
          if (generation === this.generation) this.reset();
          throw error;
        } finally {
          if (generation === this.generation) this.refreshPromise = null;
        }
      })();
    }
    return this.refreshPromise;
  }
  request = async <K extends Operation>(
    operation: K,
    options: RequestOptions<K> = {},
  ): Promise<Result<K>> => {
    const generation = this.generation;
    const access = this.tokens?.access_token;
    const signal = options.signal
      ? AbortSignal.any([options.signal, this.controller.signal])
      : this.controller.signal;
    const execute = async (token?: string) => {
      const result = await http(operation, { ...options, signal }, token);
      if (generation !== this.generation || signal.aborted) throw aborted();
      return result;
    };
    try {
      return await execute(access);
    } catch (error) {
      if (generation !== this.generation || signal.aborted) throw aborted();
      if (
        !(error instanceof DashboardError) ||
        error.status !== 401 ||
        !this.tokens
      )
        throw error;
      // A second request can return 401 after the shared refresh already finished.
      if (access === this.tokens.access_token) await this.refresh(generation);
      if (generation !== this.generation) throw aborted();
      try {
        return await execute(this.tokens?.access_token);
      } catch (retryError) {
        if (
          retryError instanceof DashboardError &&
          retryError.status === 401 &&
          generation === this.generation
        )
          this.reset();
        throw retryError;
      }
    }
  };
  logout = async () => {
    const tokens = this.tokens;
    this.reset();
    if (tokens)
      await http(
        "POST /auth/logout",
        { body: { refresh_token: tokens.refresh_token } },
        tokens.access_token,
      ).catch(() => {});
  };
}
