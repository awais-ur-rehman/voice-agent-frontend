import { beforeEach, expect, it, vi } from "vitest";
import { Session } from "./session";
const me = {
  id: "u",
  tenant_id: "t",
  email: "owner@example.test",
  role: "owner",
};
const tokens = {
  access_token: "access",
  refresh_token: "refresh",
  expires_in: 300,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
beforeEach(() => vi.restoreAllMocks());
it("uses /me authority, singleflights refresh and preserves idempotency across retry", async () => {
  let refreshes = 0;
  const calls: RequestInit[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push(init);
      if (url.endsWith("/auth/login")) return json(tokens);
      if (url.endsWith("/auth/me")) return json(me);
      if (url.endsWith("/auth/refresh")) {
        refreshes++;
        await new Promise((r) => setTimeout(r, 5));
        return json({ ...tokens, access_token: "fresh" });
      }
      return init.headers &&
        new Headers(init.headers).get("Authorization") === "Bearer fresh"
        ? json({
            profile: true,
            providers: false,
            services: false,
            hours: false,
            agent: false,
          })
        : json({ error: { code: "expired", message: "Expired" } }, 401);
    }),
  );
  const session = new Session(() => {});
  await session.login({ email: me.email, password: "password" });
  expect(session.snapshot.me).toEqual(me);
  await Promise.all([
    session.request("GET /dashboard/setup"),
    session.request("GET /dashboard/setup"),
  ]);
  expect(refreshes).toBe(1);
  expect(session.snapshot.sessionId).not.toContain("access");
});
it("logout aborts requests, clears cache/media and fences late results", async () => {
  let resolve!: (response: Response) => void;
  const cleanup = vi.fn();
  const media = vi.fn();
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/login")) return json(tokens);
      if (url.endsWith("/auth/me")) return json(me);
      if (url.endsWith("/auth/logout")) return json({});
      signal = init.signal ?? undefined;
      return new Promise<Response>((r) => (resolve = r));
    }),
  );
  const session = new Session(cleanup);
  await session.login({ email: me.email, password: "password" });
  session.registerCleanup(media);
  const pending = session.request("GET /dashboard/setup");
  const rejected = expect(pending).rejects.toMatchObject({
    name: "AbortError",
  });
  await session.logout();
  resolve(json({ profile: true }));
  await rejected;
  expect(signal?.aborted).toBe(true);
  expect(cleanup).toHaveBeenCalled();
  expect(media).toHaveBeenCalled();
  expect(session.snapshot.me).toBeNull();
});
it("preserves revision conflict and known fields without using server copy", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      json(
        {
          error: {
            code: "revision_conflict",
            message: "Review the changed clinic.",
            details: { fields: { name: "Name is required" } },
          },
        },
        409,
      ),
    ),
  );
  const session = new Session(() => {});
  await expect(
    session.login({ email: "x@y.test", password: "bad" }),
  ).rejects.toMatchObject({
    status: 409,
    code: "revision_conflict",
    fields: { name: "Check this value." },
    message: "The saved record changed. Reload it before trying again.",
  });
});

it("isolates a late old-account result after another account signs in", async () => {
  let loginCount = 0;
  let oldResolve!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/login")) {
        loginCount++;
        return json({
          ...tokens,
          access_token: `account-${loginCount}`,
          refresh_token: `refresh-${loginCount}`,
        });
      }
      if (url.endsWith("/auth/me"))
        return json({
          ...me,
          id: `user-${loginCount}`,
          tenant_id: `tenant-${loginCount}`,
        });
      if (url.endsWith("/auth/logout")) return json({});
      if (new Headers(init.headers).get("Authorization") === "Bearer account-1")
        return new Promise<Response>((resolve) => (oldResolve = resolve));
      return json({
        profile: false,
        providers: false,
        services: false,
        hours: false,
        agent: false,
      });
    }),
  );
  const session = new Session(() => {});
  await session.login({ email: "first@example.test", password: "password" });
  const firstId = session.snapshot.sessionId;
  const old = session.request("GET /dashboard/setup");
  const fenced = expect(old).rejects.toMatchObject({ name: "AbortError" });
  await session.logout();
  await session.login({ email: "second@example.test", password: "password" });
  oldResolve(
    json({
      profile: true,
      providers: true,
      services: true,
      hours: true,
      agent: true,
    }),
  );
  await fenced;
  expect(session.snapshot.me?.tenant_id).toBe("tenant-2");
  expect(session.snapshot.sessionId).not.toBe(firstId);
  expect(await session.request("GET /dashboard/setup")).toMatchObject({
    profile: false,
  });
});

it("does not rotate again when a late401 arrives after a completed shared refresh", async () => {
  let refreshes = 0,
    oldRequests = 0;
  let lateResolve!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/login")) return json(tokens);
      if (url.endsWith("/auth/me")) return json(me);
      if (url.endsWith("/auth/refresh")) {
        refreshes++;
        return json({ ...tokens, access_token: "fresh" });
      }
      if (new Headers(init.headers).get("Authorization") === "Bearer access") {
        oldRequests++;
        if (oldRequests === 2)
          return new Promise<Response>((resolve) => (lateResolve = resolve));
        return json({ error: { code: "expired", message: "Expired" } }, 401);
      }
      return json({
        profile: true,
        providers: false,
        services: false,
        hours: false,
        agent: false,
      });
    }),
  );
  const session = new Session(() => {});
  await session.login({ email: me.email, password: "password" });
  const first = session.request("GET /dashboard/setup");
  const late = session.request("GET /dashboard/setup");
  await first;
  expect(refreshes).toBe(1);
  lateResolve(json({ error: { code: "expired", message: "Expired" } }, 401));
  await expect(late).resolves.toMatchObject({ profile: true });
  expect(refreshes).toBe(1);
});

it("does not send a mutation replay if the caller aborts during a shared refresh", async () => {
  let finishRefresh!: (value: Response) => void;
  let markRefreshing!: () => void;
  const refreshing = new Promise<void>((resolve) => (markRefreshing = resolve));
  const calls = vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith("/auth/login")) return json(tokens);
    if (url.endsWith("/auth/me")) return json(me);
    if (url.endsWith("/auth/refresh")) {
      markRefreshing();
      return new Promise<Response>((resolve) => (finishRefresh = resolve));
    }
    if (new Headers(init.headers).get("Authorization") === "Bearer access")
      return json({ error: { code: "unauthorized" } }, 401);
    return json({});
  });
  vi.stubGlobal("fetch", calls);
  const session = new Session(() => {});
  await session.login({ email: me.email, password: "password" });
  const controller = new AbortController();
  const pending = session.request("POST /appointments", {
    idempotencyKey: "synthetic-request",
    signal: controller.signal,
  });
  const result = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await refreshing;
  controller.abort();
  finishRefresh(json({ ...tokens, access_token: "fresh" }));
  await result;
  expect(
    calls.mock.calls.filter(([url]) => url.endsWith("/appointments")),
  ).toHaveLength(1);
  expect(
    calls.mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
  ).toHaveLength(1);
  expect(session.snapshot.me).toEqual(me);
});

it("keeps caller cancellation separate from a rejected shared refresh", async () => {
  let finishRefresh!: (value: Response) => void;
  let markRefreshing!: () => void;
  const refreshing = new Promise<void>((resolve) => (markRefreshing = resolve));
  const calls = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/login")) return json(tokens);
    if (url.endsWith("/auth/me")) return json(me);
    if (url.endsWith("/auth/refresh")) {
      markRefreshing();
      return new Promise<Response>((resolve) => (finishRefresh = resolve));
    }
    return json({ error: { code: "unauthorized" } }, 401);
  });
  vi.stubGlobal("fetch", calls);
  const clearCache = vi.fn();
  const session = new Session(clearCache);
  await session.login({ email: me.email, password: "password" });

  const controller = new AbortController();
  const query = session.request("GET /dashboard/setup", {
    signal: controller.signal,
  });
  await refreshing;
  const mutation = session.request("POST /appointments", {
    signal: new AbortController().signal,
  });
  const outcomes = Promise.allSettled([query, mutation]);
  // Let the in-memory mutation 401 reach the already pending refresh.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  controller.abort();
  finishRefresh(
    Response.json(
      { error: { code: "rate_limited", message: "synthetic private details" } },
      { status: 429, headers: { "Retry-After": "15" } },
    ),
  );
  const [canceled, live] = await outcomes;
  expect(calls.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    "/auth/login",
    "/auth/me",
    "/dashboard/setup",
    "/auth/refresh",
    "/appointments",
  ]);
  expect(live).toMatchObject({
    status: "rejected",
    reason: { status: 429, code: "rate_limited", retryAfterSeconds: 15 },
  });
  expect(session.snapshot).toMatchObject({
    me: null,
    signInNotice: "Too many requests. Wait 15 seconds before trying again.",
  });
  expect(clearCache).toHaveBeenCalledTimes(2);
  expect(canceled).toMatchObject({
    status: "rejected",
    reason: { name: "AbortError" },
  });
});

it.each([
  [429, "rate_limited", "15"],
  [503, "service_draining", "3"],
] as const)(
  "surfaces %i without replaying credentials or a mutation",
  async (status, code, wait) => {
    const calls = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/login")) return json(tokens);
      if (url.endsWith("/auth/me")) return json(me);
      return Response.json(
        { error: { code } },
        { status, headers: { "Retry-After": wait } },
      );
    });
    vi.stubGlobal("fetch", calls);
    const session = new Session(() => {});
    await session.login({ email: me.email, password: "password" });
    await expect(session.request("POST /appointments")).rejects.toMatchObject({
      code,
      status,
      retryAfterSeconds: Number(wait),
    });
    expect(calls.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
      "/auth/login",
      "/auth/me",
      "/appointments",
    ]);
    expect(session.snapshot.me).toEqual(me);
  },
);

it("ignores a late 401 from before logout and never attempts refresh or replay", async () => {
  let complete!: (response: Response) => void;
  const calls = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/login")) return json(tokens);
    if (url.endsWith("/auth/me")) return json(me);
    if (url.endsWith("/auth/logout")) return json({});
    return new Promise<Response>((resolve) => (complete = resolve));
  });
  vi.stubGlobal("fetch", calls);
  const session = new Session(() => {});
  await session.login({ email: me.email, password: "password" });
  const pending = session.request("POST /appointments");
  const rejected = expect(pending).rejects.toMatchObject({
    name: "AbortError",
  });
  await session.logout();
  complete(json({ error: { code: "unauthorized" } }, 401));
  await rejected;
  expect(calls.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    "/auth/login",
    "/auth/me",
    "/appointments",
    "/auth/logout",
  ]);
  expect(session.snapshot.me).toBeNull();
});

it("clears identity on rate-limited refresh and keeps only safe sign-in copy", async () => {
  const calls = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/login")) return json(tokens);
    if (url.endsWith("/auth/me")) return json(me);
    if (url.endsWith("/auth/refresh"))
      return Response.json(
        {
          error: { code: "rate_limited", message: "raw synthetic credential" },
        },
        { status: 429, headers: { "Retry-After": "15" } },
      );
    return json({ error: { code: "unauthorized" } }, 401);
  });
  vi.stubGlobal("fetch", calls);
  const clearCache = vi.fn();
  const session = new Session(clearCache);
  await session.login({ email: me.email, password: "password" });
  const sessionId = session.snapshot.sessionId;
  await expect(session.request("POST /appointments")).rejects.toMatchObject({
    status: 429,
  });
  expect(calls.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    "/auth/login",
    "/auth/me",
    "/appointments",
    "/auth/refresh",
  ]);
  expect(clearCache).toHaveBeenCalledTimes(2);
  expect(session.snapshot).toEqual({
    sessionId: expect.any(String),
    me: null,
    signInNotice: "Too many requests. Wait 15 seconds before trying again.",
  });
  expect(session.snapshot.sessionId).not.toBe(sessionId);
  await session.login({ email: me.email, password: "password" });
  expect(session.snapshot.me).toEqual(me);
  expect(session.snapshot.signInNotice).toBeNull();
});

it("cannot carry a late refresh failure into a newer identity", async () => {
  let finishRefresh!: (value: Response) => void;
  let markRefreshing!: () => void;
  const refreshing = new Promise<void>((resolve) => (markRefreshing = resolve));
  let loginCount = 0;
  const calls = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/login")) {
      loginCount++;
      return json({ ...tokens, access_token: `account-${loginCount}` });
    }
    if (url.endsWith("/auth/me"))
      return json({ ...me, id: `user-${loginCount}` });
    if (url.endsWith("/auth/logout")) return json({});
    if (url.endsWith("/auth/refresh")) {
      markRefreshing();
      return new Promise<Response>((resolve) => (finishRefresh = resolve));
    }
    return json({ error: { code: "unauthorized" } }, 401);
  });
  vi.stubGlobal("fetch", calls);
  const session = new Session(() => {});
  await session.login({ email: me.email, password: "password" });
  const pending = session.request("POST /appointments");
  const rejected = expect(pending).rejects.toMatchObject({
    name: "AbortError",
  });
  await refreshing;
  await session.logout();
  await session.login({ email: "second@example.test", password: "password" });
  const active = session.snapshot;
  finishRefresh(
    Response.json(
      { error: { code: "admission_unavailable" } },
      { status: 503, headers: { "Retry-After": "1" } },
    ),
  );
  await rejected;
  expect(session.snapshot).toBe(active);
  expect(active.me?.id).toBe("user-2");
  expect(active.signInNotice).toBeNull();
  expect(
    calls.mock.calls.filter(([url]) => url.endsWith("/appointments")),
  ).toHaveLength(1);
  expect(
    calls.mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
  ).toHaveLength(1);
});
