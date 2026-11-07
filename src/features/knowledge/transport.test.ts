import { beforeEach, expect, it, vi } from "vitest";
import { http } from "../../api/dashboard";
import type { Session } from "../../api/session";
import { DashboardError } from "../../api/dashboard";

beforeEach(() => vi.restoreAllMocks());
it("sends actual Blob bytes with checksum and idempotency headers", async () => {
  const file = new Blob([new Uint8Array([0, 255, 128, 65])]);
  const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "source" }));
  vi.stubGlobal("fetch", fetcher);
  await http("POST /dashboard/agents/{agent_id}/knowledge/sources/upload", {
    params: { agent_id: "agent" },
    body: file,
    checksum: "a".repeat(64),
    query: { name: "Reviewed file", format: "txt" },
    idempotencyKey: "same-key",
  });
  const [, init] = fetcher.mock.calls[0]!;
  expect(init.body).toBe(file);
  expect(new Headers(init.headers).get("Content-Type")).toBe(
    "application/octet-stream",
  );
  expect(new Headers(init.headers).get("X-Content-SHA256")).toBe(
    "a".repeat(64),
  );
  expect(new Headers(init.headers).get("Idempotency-Key")).toBe("same-key");
});
it("computes SHA256 from bytes and captures replace metadata with its revision", async () => {
  const { captureFile } = await import("./write");
  const file = new File(["abc"], "guide.txt", { type: "text/plain" });
  // jsdom File lacks arrayBuffer; use the actual byte payload at the digest boundary.
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => new TextEncoder().encode("abc").buffer,
  });
  const command = await captureFile("agent", " Guide ", "txt", file, {
    id: "source",
    revision: 4,
  });
  expect(command.operation).toBe(
    "PUT /dashboard/agents/{agent_id}/knowledge/sources/{source_id}/content",
  );
  expect(command.options.body).toBe(file);
  expect(command.options.checksum).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  expect(command.options.query).toEqual({
    name: "Guide",
    format: "txt",
    revision: 4,
  });
});
it("retains exact unknown intent then clears it on success, definite conflict or auth reset", async () => {
  const { KnowledgeWrite } = await import("./write");
  let cleanup = () => {};
  const request = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("Disconnected"))
    .mockResolvedValue({ id: "source" });
  const writer = new KnowledgeWrite(request as Session["request"], (fn) => {
    cleanup = fn;
    return () => {};
  });
  writer.mount();
  const command = {
    operation: "POST /dashboard/agents/{agent_id}/knowledge/sources" as const,
    options: {
      params: { agent_id: "agent" },
      body: {
        kind: "text" as const,
        name: "Guide",
        text: "Safe source",
        format: "txt" as const,
      },
      idempotencyKey: "reviewed-key",
    },
  };
  await writer.submit(command);
  expect(writer.getSnapshot().pending).toBe(true);
  await writer.retry();
  expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);
  expect(request.mock.calls[0]?.[1]).toBe(command.options);
  expect(writer.getSnapshot().pending).toBe(false);
  request.mockRejectedValueOnce(
    new DashboardError(409, "revision_conflict", "Changed"),
  );
  await writer.submit(command);
  expect(writer.getSnapshot().pending).toBe(false);
  expect(writer.getSnapshot().error).toBeInstanceOf(DashboardError);
  request.mockRejectedValueOnce(new TypeError("Disconnected"));
  await writer.submit(command);
  cleanup();
  await writer.retry();
  await writer.submit(command);
  expect(request).toHaveBeenCalledTimes(4);
  expect(writer.getSnapshot().pending).toBe(false);
});
