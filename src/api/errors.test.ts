import { afterEach, expect, it, vi } from "vitest";
import { request } from "./client";
import { DashboardError, http } from "./dashboard";

const secret =
  "<script>private@example.test</script> https://example.test/?sig=private";
const dashboard = (signal?: AbortSignal) =>
  http("GET /dashboard/setup", signal ? { signal } : {});
const legacy = (signal?: AbortSignal) =>
  request("/voice/agents", undefined, undefined, signal);
const envelope = (code: string, details?: object) => ({
  error: { code, message: secret, details },
});
function reply(response: Response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([
  { run: dashboard, limit: 16 * 1024, payload: envelope("service_draining") },
  {
    run: legacy,
    limit: 2 * 1024,
    payload: { detail: "voice_urdu_unavailable" },
  },
])(
  "stops after $limit actual bytes and never waits for cancellation",
  async ({ run, limit, payload }) => {
    vi.useFakeTimers();
    const body = new TextEncoder().encode(
      JSON.stringify(payload) + " ".repeat(limit + 1024),
    );
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    let offset = 0;
    const pull = vi.fn(
      (controller: ReadableStreamDefaultController<Uint8Array>) => {
        controller.enqueue(body.subarray(offset, (offset += 256)));
        if (offset >= body.length) controller.close();
      },
    );
    reply(
      new Response(new ReadableStream({ pull, cancel }, { highWaterMark: 0 }), {
        status: 503,
        headers: { "Content-Length": "1", "Retry-After": "3" },
      }),
    );
    await expect(run()).rejects.toMatchObject({
      code: "request_failed",
      retryAfterSeconds: 3,
    });
    expect(pull).toHaveBeenCalledTimes(limit / 256 + 1);
    expect(cancel).toHaveBeenCalledOnce();
  },
);

it("cancels an overflowing multibyte chunk even if the server never closes", async () => {
  const bytes = new TextEncoder().encode(
    JSON.stringify(
      envelope("service_draining", {
        padding: "ی".repeat(8500),
      }),
    ),
  );
  expect(bytes.byteLength).toBeGreaterThan(16 * 1024);
  const cancel = vi.fn(() => new Promise<void>(() => {}));
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
    },
    cancel,
  });
  reply(new Response(stream, { status: 503 }));
  await expect(dashboard()).rejects.toMatchObject({ code: "request_failed" });
  expect(cancel).toHaveBeenCalledOnce();
}, 1800);

it.each([dashboard, legacy])(
  "stops reading an idle error body and preserves the wait header",
  async (run) => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    reply(
      new Response(new ReadableStream({ cancel }), {
        status: 429,
        headers: { "Retry-After": "3600" },
      }),
    );
    const failed = expect(run()).rejects.toMatchObject({
      code: "request_failed",
      retryAfterSeconds: 3600,
      message: expect.stringContaining("Wait 3600 seconds"),
    });
    await vi.advanceTimersByTimeAsync(1000);
    await failed;
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  },
  1800,
);

it.each([dashboard, legacy])(
  "cancels an idle read immediately on caller abort",
  async (run) => {
    const controller = new AbortController();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const pull = vi.fn();
    reply(
      new Response(new ReadableStream({ pull, cancel }, { highWaterMark: 0 }), {
        status: 503,
      }),
    );
    const rejected = expect(run(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(pull).toHaveBeenCalledOnce();
    controller.abort(secret);
    await rejected;
    expect(cancel).toHaveBeenCalledOnce();
  },
  1800,
);

it.each([dashboard, legacy])(
  "ignores untrusted retry header forms",
  async (run) => {
    for (const value of [
      "0",
      "3601",
      "-1",
      "+3",
      "3.0",
      "1e2",
      "1, 2",
      "Wed, 21 Oct 2026 07:28:00 GMT",
      "999999999999999999",
      secret,
    ]) {
      reply(
        Response.json(envelope("rate_limited"), {
          status: 429,
          headers: { "Retry-After": value },
        }),
      );
      await expect(run()).rejects.toMatchObject({
        retryAfterSeconds: undefined,
        message: "Too many requests.",
      });
    }
  },
);

it.each([
  [429, "rate_limited", "Too many requests."],
  [503, "admission_unavailable", "The service is temporarily unavailable."],
  [503, "service_draining", "The service is pausing new sessions."],
  [413, "request_too_large", "The request is too large."],
  [400, "invalid_content_length", "The request could not be sent."],
  [414, "query_too_large", "The search is too long."],
  [431, "headers_too_large", "The request could not be sent."],
  [500, "internal_error", "The request could not be completed."],
  [403, "forbidden", "This staff account cannot access that resource."],
  [409, "revision_conflict", "The saved record changed."],
  [409, "voice_unavailable", "Voice is currently unavailable."],
] as const)(
  "keeps the public %i %s code and substitutes controlled text",
  async (status, code, message) => {
    for (const run of [dashboard, legacy]) {
      reply(Response.json(envelope(code), { status }));
      await expect(run()).rejects.toMatchObject({
        code,
        message: expect.stringContaining(message),
      });
    }
  },
);

it.each([secret, "toString", "__proto__", "service_draining"])(
  "uses a fixed fallback for unknown or mismatched codes %s",
  async (code) => {
    reply(
      Response.json(envelope(code, { fields: [secret, "body.email"] }), {
        status: 500,
      }),
    );
    await expect(dashboard()).rejects.toMatchObject({
      code: "request_failed",
      fields: {},
      message: "The request could not be completed. Try again.",
    });
  },
);

it.each([
  {
    fields: {
      "body.email": secret,
      [secret]: secret,
      password: { unexpected: secret },
      constructor: secret,
    },
  },
  {
    fields: [
      "body.email",
      secret,
      "constructor",
      "body.email.private@example.test",
    ],
  },
])(
  "returns fixed validation copy for recognized fields only",
  async ({ fields }) => {
    reply(
      Response.json(envelope("validation_error", { fields }), { status: 422 }),
    );
    const error = await dashboard().catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(DashboardError);
    expect((error as DashboardError).fields).toEqual({
      "body.email": "Check this value.",
    });
  },
);

it("projects only validated slot alternatives from a scheduling conflict", async () => {
  const slot = {
    starts_at: "2027-05-01T10:00:00+05:00",
    ends_at: "2027-05-01T10:30:00+05:00",
    provider_id: "11111111-1111-4111-8111-111111111111",
    service_id: "22222222-2222-4222-8222-222222222222",
  };
  const bad = { ...slot, ends_at: slot.starts_at };
  for (const [status, code, alternatives, expected] of [
    [409, "slot_unavailable", [{ ...slot, label: secret }], [slot]],
    [409, "slot_unavailable", [{ ...slot, starts_at: secret }], []],
    [409, "slot_unavailable", [bad], []],
    [403, "forbidden", [slot], []],
  ] as const) {
    reply(Response.json(envelope(code, { alternatives }), { status }));
    const error = await dashboard().catch((e) => e);
    expect(error.alternatives).toEqual(expected);
    expect(error.message).not.toContain(secret);
  }
});

it("supports the legacy Urdu error without exposing implementation details", async () => {
  reply(Response.json({ detail: "voice_urdu_unavailable" }, { status: 503 }));
  await expect(legacy()).rejects.toMatchObject({
    code: "voice_urdu_unavailable",
    message: "Urdu voice is currently unavailable.",
  });
});

it.each([dashboard, legacy])(
  "keeps transport and invalid-success errors free of raw diagnostics",
  async (run) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(secret)));
    await expect(run()).rejects.toMatchObject({
      message: "Could not connect to the service. Try again.",
    });
    reply(new Response(secret));
    await expect(run()).rejects.toMatchObject({
      message: "The service returned an unreadable response. Try again.",
    });
  },
);
