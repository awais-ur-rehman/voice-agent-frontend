import { lazy, Suspense, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "../../app/auth";
import type { CalendarAppointment } from "../../api/dashboard.generated";
import { DashboardError } from "../../api/dashboard";
import {
  useCatalog,
  useDashboardQuery,
  useRefreshClinic,
  QueryState,
} from "../clinic/ClinicPages";
import {
  PageHeader,
  EmptyState,
  ErrorSummary,
  StatusBadge,
  ConfirmDialog,
} from "../../components/ui/patterns";
import { AppointmentForm } from "./AppointmentForm";
import {
  clinicToday,
  dateWindow,
  shiftDate,
  slotLabel,
  weekStart,
} from "./dates";
const Calendar = lazy(() => import("./Calendar"));
export function SchedulePage() {
  const clinic = useDashboardQuery("GET /dashboard/clinic");
  return (
    <QueryState query={clinic}>
      {clinic.data && <Schedule zone={clinic.data.timezone} />}
    </QueryState>
  );
}
function Schedule({ zone }: { zone: string }) {
  const auth = useAuth(),
    refresh = useRefreshClinic(),
    catalog = useCatalog();
  const [date, setDate] = useState(() => clinicToday(zone)),
    [view, setView] = useState<"day" | "week" | "list">("week"),
    [spanDays, setSpanDays] = useState(7),
    [provider, setProvider] = useState(""),
    [selected, setSelected] = useState<CalendarAppointment | null>(null),
    [editing, setEditing] = useState(false),
    [adding, setAdding] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [cancelKey, setCancelKey] = useState(() => crypto.randomUUID()),
    [uncertain, setUncertain] = useState(false);
  const range = dateWindow(
    spanDays === 1 ? date : weekStart(date),
    spanDays,
    zone,
  );
  const query = useQuery({
    queryKey: useSessionKey("calendar", undefined, {
      first: range.first,
      last: range.last,
      provider,
      zone,
    }),
    queryFn: async ({ signal }) => {
      const rows: CalendarAppointment[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await auth.request("GET /dashboard/appointments", {
          query: {
            date_from: range.first,
            date_to: range.last,
            provider_id: provider || undefined,
            limit: 100,
            offset,
          },
          signal,
        });
        rows.push(...page.items);
        if (offset + page.items.length >= page.total || page.items.length === 0)
          return rows;
      }
    },
  });
  async function cancel() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await auth.request("POST /appointments/{identity}/cancel", {
        params: { identity: selected.id },
        body: { confirmed: true },
        idempotencyKey: cancelKey,
      });
      await refresh();
      setSelected(null);
      setUncertain(false);
      setCancelKey(crypto.randomUUID());
    } catch (e) {
      setError(e);
      setUncertain(!(e instanceof DashboardError) || e.status >= 500);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Schedule"
        description={`Appointments · ${zone}`}
        actions={
          <button
            className="button"
            disabled={busy || uncertain || adding || editing}
            onClick={() => {
              setSelected(null);
              setAdding(true);
            }}
          >
            New appointment
          </button>
        }
      />
      <SetupReminder />
      <section className="panel">
        <div className="schedule-toolbar">
          <div className="button-group">
            <button
              className="button secondary"
              onClick={() => setDate(shiftDate(date, -spanDays))}
            >
              Previous
            </button>
            <button
              className="button secondary"
              onClick={() => setDate(clinicToday(zone))}
            >
              Today
            </button>
            <button
              className="button secondary"
              onClick={() => setDate(shiftDate(date, spanDays))}
            >
              Next
            </button>
          </div>
          <div className="form-field">
            <label htmlFor="schedule-date">Clinic date</label>
            <input
              id="schedule-date"
              type="date"
              required
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="schedule-provider">Provider filter</label>
            <select
              id="schedule-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="">All providers</option>
              {catalog.providers.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="button-group" aria-label="Calendar view">
            {(["day", "week", "list"] as const).map((v) => (
              <button
                key={v}
                className={`button ${view === v ? "" : "secondary"}`}
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  if (v !== "list") setSpanDays(v === "day" ? 1 : 7);
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p className="muted">
          {range.first} – {range.last} · {zone}. The appointment list below
          supports keyboard and mobile use.
        </p>
        <QueryState query={query}>
          {query.data?.length === 0 ? (
            <EmptyState>No appointments in this period.</EmptyState>
          ) : (
            <>
              {view !== "list" && (
                <div className="desktop-calendar">
                  <Suspense fallback={<p role="status">Loading calendar…</p>}>
                    <Calendar
                      date={date}
                      zone={zone}
                      view={view}
                      events={query.data ?? []}
                      onSelect={setSelected}
                    />
                  </Suspense>
                </div>
              )}
              <h2 className="list-heading">Appointment list</h2>
              <div className="appointment-list">
                {query.data?.map((row) => (
                  <button
                    className="appointment-row"
                    key={row.id}
                    onClick={() => {
                      setSelected(row);
                      setError(null);
                      setCancelKey(crypto.randomUUID());
                    }}
                  >
                    <span className="appointment-time" dir="ltr">
                      {slotLabel(row.starts_at, zone)}
                    </span>
                    <span dir="auto">
                      <strong>{row.patient_name}</strong>
                      {row.patient_name_ur && (
                        <small className="urdu" lang="ur">
                          {row.patient_name_ur}
                        </small>
                      )}
                      <small>
                        {row.service_name} · {row.provider_name}
                      </small>
                    </span>
                    <StatusBadge>{row.status}</StatusBadge>
                  </button>
                ))}
              </div>
            </>
          )}
        </QueryState>
      </section>
      {selected && (
        <section className="panel editor">
          <h2>Appointment details</h2>
          <p dir="auto">
            {selected.patient_name} · {selected.provider_name} ·{" "}
            {selected.service_name}
          </p>
          <p dir="ltr">
            {slotLabel(selected.starts_at, zone)} –{" "}
            {slotLabel(selected.ends_at, zone)} · {zone}
          </p>
          <Link to={`/patients/${selected.patient_id}`}>
            View patient history
          </Link>
          <ErrorSummary error={error} />
          {selected.status === "booked" && (
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={busy || uncertain}
                onClick={() => setEditing(true)}
              >
                Reschedule
              </button>
              <ConfirmDialog
                title="Cancel this appointment?"
                confirm="Confirm cancellation"
                busy={busy}
                onConfirm={cancel}
              >
                Cancel {selected.patient_name}'s appointment at{" "}
                {slotLabel(selected.starts_at, zone)}. This action must be
                confirmed.
                <ErrorSummary error={error} />
                {uncertain && (
                  <p>
                    Outcome uncertain. Retry this same cancellation to resolve
                    it.
                  </p>
                )}
              </ConfirmDialog>
              {uncertain && (
                <p>
                  The outcome is uncertain. Retry the same cancellation to
                  resolve it.
                </p>
              )}
            </div>
          )}
          <button
            className="button secondary"
            disabled={busy || uncertain}
            onClick={() => {
              setSelected(null);
              setEditing(false);
            }}
          >
            Close details
          </button>
        </section>
      )}
      {(adding || editing) && (
        <AppointmentForm
          key={editing ? selected?.id : "new"}
          date={date}
          zone={zone}
          {...(editing && selected ? { appointment: selected } : {})}
          onDone={() => {
            setAdding(false);
            setEditing(false);
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
function SetupReminder() {
  const setup = useDashboardQuery("GET /dashboard/setup");
  return setup.data && Object.values(setup.data).some((done) => !done) ? (
    <p className="notice">
      Your clinic setup is incomplete.{" "}
      <Link to="/setup">Review setup checklist</Link>
    </p>
  ) : null;
}
