import { expect, it } from "vitest";
import { dateWindow, slotLabel } from "./dates";
it("uses clinic midnight despite a different browser zone", () => {
  expect(dateWindow("2026-10-29", 1, "Asia/Karachi")).toEqual({
    first: "2026-10-29",
    last: "2026-10-29",
    start: "2026-10-28T19:00:00Z",
    end: "2026-10-29T19:00:00Z",
  });
});
it("bounds spring gap and autumn fold days without shifting API instants", () => {
  const spring = dateWindow("2026-03-08", 1, "America/New_York");
  expect(Date.parse(spring.end) - Date.parse(spring.start)).toBe(23 * 3600000);
  const fall = dateWindow("2026-11-01", 1, "America/New_York");
  expect(Date.parse(fall.end) - Date.parse(fall.start)).toBe(25 * 3600000);
  expect(slotLabel("2026-11-01T05:30:00Z", "America/New_York")).not.toBe(
    slotLabel("2026-11-01T06:30:00Z", "America/New_York"),
  );
});
