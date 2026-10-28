import { beforeEach, expect, it, vi } from "vitest";
import { IsolatedTest } from "./isolated-test";
import { Session } from "../../api/session";
import { testSnapshot, voiceSnapshot } from "./fixtures.test-support";
import type { MediaEvents } from "../voice/media";
let writes: string[];
let events: MediaEvents;
let deny = false,
  mismatch = false,
  expired = false;
let late: ((r: Response) => void) | undefined;
let hold = false;
const media = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  setMuted: vi.fn(),
  enableAudio: vi.fn(),
};
beforeEach(() => {
  writes = [];
  deny = false;
  mismatch = false;
  expired = false;
  hold = false;
  late = undefined;
  vi.clearAllMocks();
  media.connect.mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const path = new URL(input).pathname;
      writes.push(path);
      if (path === "/auth/login")
        return Response.json({
          access_token: "staff",
          refresh_token: "refresh",
          expires_in: 300,
        });
      if (path === "/auth/me")
        return Response.json({
          id: "staff",
          tenant_id: "clinic",
          email: "staff@example.test",
          role: "owner",
        });
      if (expired)
        return Response.json(
          { error: { code: "unauthorized" } },
          { status: 401 },
        );
      if (path.endsWith("/tests")) {
        if (hold) return new Promise<Response>((r) => (late = r));
        return Response.json({
          ...testSnapshot,
          transport_capabilities: {
            text: { available: true },
            voice: { available: true },
          },
        });
      }
      if (path.endsWith("/voice") || path.endsWith("/resume")) {
        if (deny)
          return Response.json(
            {
              error: {
                code: "voice_unavailable",
                message: "SECRET raw server body",
              },
            },
            { status: 503 },
          );
        return Response.json({
          ...voiceSnapshot,
          media: {
            ...voiceSnapshot.media,
            session_id: mismatch ? "stale" : voiceSnapshot.session_id,
          },
        });
      }
      if (path.endsWith("/turns"))
        return Response.json({
          id: "parent-test",
          revision: 2,
          status: "active",
          messages: [
            { role: "assistant", text: "Synthetic appointment available." },
          ],
          tool_trace: [{ action: "find_slots", code: "ok", ok: true }],
        });
      if (path.endsWith("/end"))
        return Response.json({ ...testSnapshot, status: "ended" });
      return Response.json(testSnapshot);
    }),
  );
});
async function setup() {
  const session = new Session(() => {});
  await session.login({ email: "staff@example.test", password: "password" });
  const test = new IsolatedTest(
    session.request,
    session.registerCleanup,
    (e) => {
      events = e;
      return media;
    },
  );
  test.mount();
  return { test, session };
}
it("binds media to child runtime identity while all staff requests retain opaque parent scope", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  await test.voice();
  expect(media.connect).toHaveBeenCalledWith(
    expect.objectContaining({ session_id: "child-runtime", generation: 2 }),
  );
  expect(writes).toContain("/dashboard/tests/parent-test/voice");
  test.dispose();
});
it("microphone denial cleans allocation and allows fresh start", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  media.connect.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  await test.voice();
  expect(test.getSnapshot().error).toMatch(/Microphone/);
  expect(media.disconnect).toHaveBeenCalled();
  expect(writes).toContain("/dashboard/tests/parent-test/voice/end");
  await test.voice();
  expect(test.getSnapshot().mediaState).toBe("connected");
  test.dispose();
});
it("end clears media and captions and disables conversation", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  await test.voice();
  test.captions(true);
  events.caption("Private caption", "en");
  expect(test.getSnapshot().caption?.text).toBe("Private caption");
  await test.end();
  expect(test.getSnapshot().caption).toBeNull();
  expect(test.getSnapshot().snapshot?.status).toBe("ended");
  expect(media.disconnect).toHaveBeenCalled();
  test.dispose();
});
it("requires explicit speaker retry without claiming delivered speech", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  await test.voice();
  events.audioBlocked();
  expect(test.getSnapshot().audioBlocked).toBe(true);
  await test.enableAudio();
  expect(media.enableAudio).toHaveBeenCalled();
  expect(test.getSnapshot().audioBlocked).toBe(false);
  expect(test.getSnapshot().mediaState).toBe("connected");
  test.dispose();
});
it("reconnect clears old captions and fences previous worker events", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  await test.voice();
  test.captions(true);
  events.caption("Old", "en");
  const old = events;
  await test.voice(true);
  old.caption("Stale", "en");
  expect(test.getSnapshot().caption).toBeNull();
  events.caption("New", "ur");
  expect(test.getSnapshot().caption?.text).toBe("New");
  test.dispose();
});
it("late allocation after unmount is ended with current authorized ownership", async () => {
  const { test } = await setup();
  hold = true;
  const pending = test.start("agent-one", 7);
  await vi.waitFor(() => expect(late).toBeDefined());
  test.dispose();
  late!(Response.json(testSnapshot));
  await pending;
  expect(writes).toContain("/dashboard/tests/parent-test/end");
  expect(media.connect).not.toHaveBeenCalled();
});
it("bounded speech failure never echoes arbitrary server body", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  deny = true;
  await test.voice();
  expect(test.getSnapshot().error).toMatch(/Speech/);
  expect(test.getSnapshot().error).not.toContain("SECRET");
  test.dispose();
});
it("expired credential during end resets auth and immediately stops media", async () => {
  const { test, session } = await setup();
  await test.start("agent-one", 7);
  await test.voice();
  expired = true;
  await test.end();
  expect(session.getSnapshot().me).toBeNull();
  expect(media.disconnect).toHaveBeenCalled();
  expect(test.getSnapshot().snapshot).toBeNull();
  test.dispose();
});
it("mismatched grant never joins a stale room", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  mismatch = true;
  await test.voice();
  expect(media.connect).not.toHaveBeenCalled();
  expect(test.getSnapshot().error).toMatch(/grant/);
  test.dispose();
});
it("account reset clears scope and ignores late allocation without cleanup under a new account", async () => {
  const { test, session } = await setup();
  hold = true;
  const pending = test.start("agent-one", 7);
  await vi.waitFor(() => expect(late).toBeDefined());
  await session.logout();
  await session.login({ email: "other@example.test", password: "password" });
  late!(Response.json(testSnapshot));
  await pending;
  expect(test.getSnapshot().snapshot).toBeNull();
  expect(writes).not.toContain("/dashboard/tests/parent-test/end");
  expect(media.connect).not.toHaveBeenCalled();
  test.dispose();
});
it("sends text to isolated scope and expires with local media cleanup", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  await test.turn("Find a slot");
  expect(test.getSnapshot().snapshot?.conversation.messages[0]?.text).toBe(
    "Synthetic appointment available.",
  );
  expect(test.getSnapshot().trace[0]?.action).toBe("find_slots");
  test.expire();
  expect(test.getSnapshot().snapshot?.status).toBe("expired");
  expect(test.getSnapshot().caption).toBeNull();
  test.dispose();
});
it("fences existing media callbacks immediately on account reset", async () => {
  const { test, session } = await setup();
  await test.start("agent-one", 7);
  await test.voice();
  test.captions(true);
  const stale = events;
  await session.logout();
  stale.caption("Old account caption", "en");
  stale.state("listening");
  expect(test.getSnapshot().caption).toBeNull();
  expect(test.getSnapshot().mediaState).toBeNull();
  expect(test.getSnapshot().snapshot).toBeNull();
  test.dispose();
});
it("expired server scope closes local conversation and media", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  await test.voice();
  const original = fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) =>
      input.endsWith("/turns")
        ? Promise.resolve(
            Response.json({ error: { code: "test_expired" } }, { status: 410 }),
          )
        : original(input, init),
    ),
  );
  await test.turn("Find a slot");
  expect(test.getSnapshot().snapshot?.status).toBe("expired");
  expect(test.getSnapshot().mediaState).toBeNull();
  test.dispose();
});
it("unknown text outcome retries exact command and body rather than edited replacement text", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  const original = fetch;
  const bodies: unknown[] = [];
  let fail = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) => {
      if (input.endsWith("/turns")) {
        bodies.push(JSON.parse(String(init?.body)));
        if (fail) return Promise.resolve(new Response(null, { status: 503 }));
      }
      return original(input, init);
    }),
  );
  await test.turn("Original request");
  expect(test.getSnapshot().pendingTurn).toBe(true);
  fail = false;
  await test.turn("Replacement request");
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0]).toMatchObject({ text: "Original request", revision: 1 });
  expect(test.getSnapshot().pendingTurn).toBe(false);
  test.dispose();
});
it("an uncertain end prevents replacement turns and voice until the same end is retried", async () => {
  const { test } = await setup();
  await test.start("agent-one", 7);
  const original = fetch;
  let fail = true;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) =>
      input.endsWith("/end") && fail
        ? Promise.resolve(new Response(null, { status: 503 }))
        : original(input, init),
    ),
  );
  await test.end();
  const before = writes.length;
  await test.turn("Do not dispatch");
  await test.voice();
  expect(writes).toHaveLength(before);
  expect(test.getSnapshot().pendingEnd).toBe(true);
  fail = false;
  await test.end();
  expect(test.getSnapshot().snapshot?.status).toBe("ended");
  expect(test.getSnapshot().pendingEnd).toBe(false);
  test.dispose();
});
