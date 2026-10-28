import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { slotLabel } from "./dates";
import type { CalendarAppointment } from "../../api/dashboard.generated";
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
    <FullCalendar
      key={`${date}-${view}-${zone}`}
      plugins={[timeGridPlugin, classicThemePlugin]}
      initialView={view === "day" ? "timeGridDay" : "timeGridWeek"}
      initialDate={date}
      firstDay={1}
      timeZone={zone}
      headerToolbar={false}
      allDaySlot={false}
      height="auto"
      editable={false}
      eventStartEditable={false}
      eventDurationEditable={false}
      events={events.map((row) => ({
        id: row.id,
        title: `${row.patient_name} · ${row.service_name}`,
        start: row.starts_at,
        end: row.ends_at,
      }))}
      eventClick={(info) => {
        const row = events.find((row) => row.id === info.event.id);
        if (row) onSelect(row);
      }}
      eventContent={(info) => (
        <span dir="auto">
          {info.event.startStr
            ? slotLabel(info.event.startStr, zone)
            : info.timeText}{" "}
          {info.event.title}
        </span>
      )}
    />
  );
}
