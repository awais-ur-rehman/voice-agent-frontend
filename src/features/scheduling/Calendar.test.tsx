import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { CalendarAppointment } from "../../api/dashboard.generated";
// Exercise the real event mapping and content through the calendar render boundary.
vi.mock("@fullcalendar/react", () => ({
  default: (props: {
    events: { id: string; title: string }[];
    eventContent: (info: { event: { id: string } }) => React.ReactNode;
  }) => (
    <>
      {props.events.map((event) => (
        <button key={event.id} aria-label={event.title}>
          {props.eventContent({ event })}
        </button>
      ))}
    </>
  ),
}));
import Calendar from "./Calendar";
for (const view of ["day", "week"] as const)
  it(`labels overlapping compact booked/cancelled Urdu events in ${view} view`, () => {
    const row: CalendarAppointment = {
      id: "booked",
      patient_id: "p",
      provider_id: "d",
      service_id: "s",
      patient_name: "Synthetic patient",
      patient_name_ur: "مصنوعی مریض",
      provider_name: "Dr Fixture",
      provider_name_ur: null,
      service_name: "Consultation",
      service_name_ur: null,
      starts_at: "2026-11-01T05:00:00Z",
      ends_at: "2026-11-01T05:30:00Z",
      created_at: "2026-10-01T00:00:00Z",
      status: "booked",
      rescheduled_from_id: null,
    };
    render(
      <Calendar
        date="2026-11-01"
        zone="Asia/Karachi"
        view={view}
        events={[
          row,
          { ...row, id: "cancelled", status: "cancelled" },
          { ...row, id: "completed", status: "completed" },
          { ...row, id: "no_show", status: "no_show" },
        ]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Cancelled/ })).toHaveTextContent(
      "Cancelled",
    );
    expect(screen.getByRole("button", { name: /Booked/ })).toHaveTextContent(
      "Booked",
    );
    expect(screen.getByRole("button", { name: /Completed/ })).toHaveTextContent(
      "Completed",
    );
    expect(screen.getByRole("button", { name: /No show/ })).toHaveTextContent(
      "No show",
    );
    expect(screen.getAllByText("مصنوعی مریض")).toHaveLength(4);
  });
