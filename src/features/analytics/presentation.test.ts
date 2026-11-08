import { alerts } from "./fixtures.test-support";
import { expect, it } from "vitest";
import {
  money,
  ratio,
  rangeError,
  hourLabel,
  ms,
  label,
  offsetLabel,
  alertEvidence,
} from "./presentation";
it("preserves unknown, real zero, tiny covered USD estimates and ratio denominators", () => {
  expect(money(null)).toBe("Unknown");
  expect(money("0")).toBe("USD 0");
  expect(money("0.00000003")).toBe("< USD 0.000001");
  expect(money("0.000012")).toBe("USD 0.000012");
  expect(ratio({ value: null, numerator: 0, denominator: 0 })).toBe(
    "Unknown · 0 / 0",
  );
  expect(ratio({ value: 0, numerator: 0, denominator: 8 })).toBe("0% · 0 / 8");
});
it("bounds inclusive date cohorts and preserves DST fold identity", () => {
  expect(rangeError("2026-10-01", "2026-10-31", "2026-11-08")).toBe("");
  expect(rangeError("2026-10-01", "2026-11-01", "2026-11-08")).toContain("31");
  expect(rangeError("2026-11-08", "2026-11-07", "2026-11-08")).toContain(
    "after",
  );
  expect(rangeError("2025-01-01", "2025-01-02", "2026-11-08")).toContain("365");
  expect(
    hourLabel({
      bucket_start: "2026-11-01T05:00:00Z",
      utc_offset_minutes: -240,
      timezone: "America/New_York",
    }),
  ).toContain("UTC−04:00");
  expect(
    hourLabel({
      bucket_start: "2026-11-01T06:00:00Z",
      utc_offset_minutes: -300,
      timezone: "America/New_York",
    }),
  ).toContain("UTC−05:00");
});

it("preserves measured zero versus a tiny positive latency", () => {
  expect(ms(0)).toBe("0 ms");
  expect(ms(0.03)).toBe("< 0.1 ms");
});
it("uses readable clinic labels and timezone offsets", () => {
  expect(label("booked")).toBe("Booked");
  expect(label("caller_end")).toBe("Caller ended");
  expect(label("ur")).toBe("Urdu");
  expect(label("llm_first_token")).toBe("LLM first token");
  expect(offsetLabel(300)).toBe("UTC+05:00");
});

it("keeps alert units and unknown values distinct without turning event counts into percentages", () => {
  const base = alerts.items[0]!;
  expect(
    alertEvidence({ ...base, observed_value: 0, numerator: 0, denominator: 0 }),
  ).toBe("Oldest queued: 0s · 0 queued jobs");
  expect(alertEvidence({ ...base, observed_value: null })).toBe(
    "Oldest queued: Unknown · 1 queued job",
  );
  expect(
    alertEvidence({
      ...base,
      kind: "tool_failure",
      observed_value: null,
      numerator: 0,
      denominator: 0,
    }),
  ).toBe("Unknown · 0 / 0 failed tool results");
  expect(
    alertEvidence({
      ...base,
      kind: "provider_failure",
      observed_value: 2,
      numerator: 2,
      denominator: 9,
    }),
  ).toBe("2 failed / 9 provider invocations · 15 min window");
});
