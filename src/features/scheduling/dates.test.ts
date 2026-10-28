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

it("uses human clock labels while distinguishing both repeated times", async () => {
  const { timeLabel, clinicDate, dateHeading } = await import("./dates");
  expect(timeLabel("2026-11-05T14:00:00Z", "America/New_York")).toBe("09:00");
  expect(timeLabel("2026-11-01T05:30:00Z", "America/New_York")).toBe(
    "01:30 UTC-04:00",
  );
  expect(timeLabel("2026-11-01T06:30:00Z", "America/New_York")).toBe(
    "01:30 UTC-05:00",
  );
  expect(clinicDate("2026-11-06T04:15:00Z", "America/New_York")).toBe(
    "2026-11-05",
  );
  expect(dateHeading("2026-11-05")).toBe("November 5, 2026");
});
