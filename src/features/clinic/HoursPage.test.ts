import { expect, it } from "vitest";
import { upcomingClosures } from "./HoursPage";
import type { ExceptionOut } from "../../api/dashboard.generated";
it("only reminds about manually configured closures within fourteen calendar days", () => {
  const exception = (
    start_date: string,
    kind: "closed" | "custom" = "closed",
  ): ExceptionOut => ({
    id: start_date,
    provider_id: "provider",
    start_date,
    end_date: start_date,
    kind,
  });
  const entries = [
    exception("2026-10-27"),
    exception("2026-10-28"),
    exception("2026-11-11"),
    exception("2026-11-12"),
    exception("2026-11-01", "custom"),
  ];
  expect(
    upcomingClosures(entries, "2026-10-28").map((x) => x.start_date),
  ).toEqual(["2026-10-28", "2026-11-11"]);
  expect(upcomingClosures([], "2026-10-28")).toEqual([]);
});
