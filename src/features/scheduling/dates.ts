import { Temporal } from "temporal-polyfill";
export function clinicToday(zone: string) {
  return Temporal.Now.zonedDateTimeISO(zone).toPlainDate().toString();
}
export function dateWindow(date: string, days: number, zone: string) {
  const first = Temporal.PlainDate.from(date),
    end = first.add({ days });
  return {
    first: first.toString(),
    last: end.subtract({ days: 1 }).toString(),
    start: first.toZonedDateTime(zone).toInstant().toString(),
    end: end.toZonedDateTime(zone).toInstant().toString(),
  };
}
export function shiftDate(date: string, days: number) {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}
export function slotLabel(instant: string, zone: string) {
  const date = Temporal.Instant.from(instant).toZonedDateTimeISO(zone);
  return `${date.toPlainDate()} ${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")} (UTC${date.offset})`;
}

export function weekStart(date: string) {
  const d = Temporal.PlainDate.from(date);
  return d.subtract({ days: d.dayOfWeek - 1 }).toString();
}
