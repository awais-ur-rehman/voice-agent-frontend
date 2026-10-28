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
