import { describe, expect, it } from "vitest";
import { PlaybackLedger, readWorkerMessage } from "./protocol";
const scope = {
  session_id: "24ad626c-5a6d-40cd-87d4-b946d61109e4",
  generation: 2,
};
const segment = {
  version: 1,
  ...scope,
  sequence: 1,
  kind: "segment",
  segment_id: "readback_1",
  sample_rate: 24000,
  total_samples: 48000,
  critical: true,
};
describe("worker message boundary", () => {
  it("rejects forged identity, stale generation, oversized and replayed messages", () => {
    const bytes = new TextEncoder().encode(JSON.stringify(segment));
    expect(readWorkerMessage(bytes, "caller", scope, 0)).toBeNull();
    expect(
      readWorkerMessage(bytes, "worker", { ...scope, generation: 3 }, 0),
    ).toBeNull();
    expect(readWorkerMessage(bytes, "worker", scope, 1)).toBeNull();
    expect(
      readWorkerMessage(new Uint8Array(9000), "worker", scope, 0),
    ).toBeNull();
    expect(readWorkerMessage(bytes, "worker", scope, 0)?.kind).toBe("segment");
  });
  it("rejects unknown fields and invalid segment bounds", () => {
    for (const message of [
      { ...segment, total_samples: 0 },
      { ...segment, provider_token: "secret" },
      { ...segment, critical: "yes" },
    ])
      expect(
        readWorkerMessage(
          new TextEncoder().encode(JSON.stringify(message)),
          "worker",
          scope,
          0,
        ),
      ).toBeNull();
  });
});
describe("conservative playback ledger", () => {
  it("requires segment_end and real progress, never acknowledges elapsed wall time", () => {
    const ledger = new PlaybackLedger();
    ledger.begin("readback_1", 48000, 24000, 10);
    expect(ledger.progress(100, true)).toEqual([]);
    ledger.end("readback_1");
    expect(ledger.progress(11.99, true)).toEqual([]);
    expect(ledger.progress(12, false)).toEqual([]);
    expect(ledger.progress(12, true)).toEqual([
      { segment_id: "readback_1", played_samples: 48000 },
    ]);
    expect(ledger.progress(13, true)).toEqual([]);
  });
  it("drops interrupted or disconnected segments and requires playing at segment start", () => {
    const ledger = new PlaybackLedger();
    ledger.begin("old", 24000, 24000, null);
    ledger.end("old");
    expect(ledger.progress(50, true)).toEqual([]);
    ledger.begin("new", 24000, 24000, 10);
    ledger.end("new");
    ledger.clear();
    expect(ledger.progress(100, true)).toEqual([]);
  });
});
