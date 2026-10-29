import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { timeLabel } from "./dates";
import type { CalendarAppointment } from "../../api/dashboard.generated";
const statuses: Record<string, { label: string; symbol: string }> = {
  booked: { label: "Booked", symbol: "✓" },
  cancelled: { label: "Cancelled", symbol: "×" },
  completed: { label: "Completed", symbol: "●" },
  no_show: { label: "No show", symbol: "!" },
};
export default function Calendar({
  date,
  zone,
  view,
  events,
  onSelect,
}: {
  date: string;
  zone: string;
  view: "day" | "week";
  events: CalendarAppointment[];
  onSelect: (row: CalendarAppointment) => void;
}) {
  return (
    <>
      <p className="calendar-status-legend">
        ✓ Booked · × Cancelled · ● Completed · ! No show · Select an event for
        details
      </p>
      <FullCalendar
        key={`${date}-${view}-${zone}`}
        plugins={[timeGridPlugin, classicThemePlugin]}
        className="clinic-calendar"
        initialView={view === "day" ? "timeGridDay" : "timeGridWeek"}
        initialDate={date}
        firstDay={1}
        timeZone={zone}
        headerToolbar={false}
        allDaySlot={false}
        height={600}
        scrollTime="08:00:00"
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        slotDuration="00:30:00"
        eventMinHeight={32}
        slotMinHeight={56}
        slotEventOverlap={false}
        dayHeaderFormat={{ weekday: "short", day: "numeric" }}
        editable={false}
        eventStartEditable={false}
        eventDurationEditable={false}
        eventInteractive
        events={events.map((row) => ({
          id: row.id,
          title: `${statuses[row.status]?.label ?? row.status} · ${row.patient_name}${row.patient_name_ur ? ` · ${row.patient_name_ur}` : ""}`,
          start: row.starts_at,
          end: row.ends_at,
        }))}
        eventClass="clinic-calendar-event"
        eventInnerClass="clinic-calendar-event-inner"
        eventClick={(info) => {
          const row = events.find((row) => row.id === info.event.id);
          if (row) onSelect(row);
        }}
        eventContent={(info) => {
          const row = events.find((row) => row.id === info.event.id);
          if (!row) return null;
          const compact =
            Date.parse(row.ends_at) - Date.parse(row.starts_at) <= 30 * 60000;
          const start = timeLabel(row.starts_at, zone),
            end = timeLabel(row.ends_at, zone);
          const time =
            compact || start.includes("UTC") || end.includes("UTC")
              ? start
              : `${start} – ${end}`;
          const status = statuses[row.status]?.label ?? row.status;
          const full = `${status} · ${start} – ${end} · ${row.patient_name}${row.patient_name_ur ? ` · ${row.patient_name_ur}` : ""} · ${row.service_name} · ${row.provider_name}`;
          return (
            <div
              className={`calendar-event-content ${compact ? "compact-event" : ""}`}
              title={full}
            >
              <span className="calendar-event-time" dir="ltr">
                <b className={`calendar-event-status ${row.status}`}>
                  {compact ? (
                    <>
                      <span aria-hidden="true">
                        {statuses[row.status]?.symbol ?? "?"}
                      </span>
                      <span className="sr-only">{status}</span>
                    </>
                  ) : (
                    status
                  )}
                </b>{" "}
                {time}
              </span>
              <strong
                dir="auto"
                className={row.patient_name_ur ? "urdu" : ""}
                lang={row.patient_name_ur ? "ur" : undefined}
              >
                {row.patient_name_ur ?? row.patient_name}
              </strong>
              <small className={compact ? "sr-only" : ""} dir="auto">
                {row.service_name} · {row.provider_name}
              </small>
            </div>
          );
        }}
      />
    </>
  );
}
