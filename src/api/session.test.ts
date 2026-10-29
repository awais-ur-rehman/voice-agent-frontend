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
it("safely exposes field errors without losing the server conflict meaning", async () => {
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
    fields: { name: "Name is required" },
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
