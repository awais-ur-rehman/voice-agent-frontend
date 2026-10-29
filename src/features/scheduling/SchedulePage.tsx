import { useResolveBeforeLeaving } from "../../components/ui/useResolveBeforeLeaving";
import { lazy, Suspense, useRef, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
} from "../../components/ui/patterns";
import { AppointmentForm } from "./AppointmentForm";
import {
  clinicToday,
  dateWindow,
  shiftDate,
  slotLabel,
  weekStart,
  dateHeading,
  timeLabel,
  clinicDate,
} from "./dates";
const Calendar = lazy(() => import("./Calendar"));
function subscribeMobile(listener: () => void) {
  const media = window.matchMedia?.("(max-width: 767px)");
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
}
function mobileSnapshot() {
  return window.matchMedia?.("(max-width: 767px)").matches ?? false;
}
type Workspace =
  | { kind: "new"; key: string }
  | {
      kind: "details" | "reschedule" | "cancel";
      appointment: CalendarAppointment;
      key: string;
    };
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
  const mobile = useSyncExternalStore(
    subscribeMobile,
    mobileSnapshot,
    () => false,
  );
  const [date, setDate] = useState(() => clinicToday(zone)),
    [view, setView] = useState<"day" | "week" | "list">("week"),
    [spanDays, setSpanDays] = useState(7),
    [provider, setProvider] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [locked, setLocked] = useState(false),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState<unknown>(null);
  const navigation = useResolveBeforeLeaving(locked);
  const owner = useRef<Workspace | null>(null),
    lock = useRef(false),
    opener = useRef<HTMLElement | null>(null),
    newButton = useRef<HTMLButtonElement>(null);
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
  function replaceWorkspace(next: Workspace | null) {
    owner.current = next;
    setWorkspace(next);
  }
  function lockIntent(next: boolean) {
    if (!next) navigation.release();
    lock.current = next;
    setLocked(next);
  }
  function finish() {
    lockIntent(false);
    replaceWorkspace(null);
    setUncertain(false);
    setError(null);
  }
  function close() {
    if (!lock.current) finish();
  }
  function select(row: CalendarAppointment) {
    if (owner.current || lock.current) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setError(null);
    setUncertain(false);
    replaceWorkspace({
      kind: "details",
      appointment: { ...row },
      key: crypto.randomUUID(),
    });
  }
  function changeKind(kind: "details" | "reschedule" | "cancel") {
    const current = owner.current;
    if (lock.current || !current || current.kind === "new") return;
    setError(null);
    replaceWorkspace({ ...current, kind });
  }
  async function cancel() {
    const intent = owner.current;
    if (!intent || intent.kind !== "cancel" || busy) return;
    lockIntent(true);
    setBusy(true);
    setError(null);
    try {
      await auth.request("POST /appointments/{identity}/cancel", {
        params: { identity: intent.appointment.id },
        body: { confirmed: true },
        idempotencyKey: intent.key,
      });
      await refresh();
      finish();
    } catch (e) {
      setError(e);
      const unknownOutcome =
        !(e instanceof DashboardError) || e.status >= 500 || e.status === 408;
      setUncertain(unknownOutcome);
      lockIntent(unknownOutcome);
    } finally {
      setBusy(false);
    }
  }
  const selected =
    workspace && workspace.kind !== "new" ? workspace.appointment : null;
  const title =
    workspace?.kind === "new"
      ? "New appointment"
      : workspace?.kind === "reschedule"
        ? "Reschedule appointment"
        : workspace?.kind === "cancel"
          ? "Cancel this appointment?"
          : "Appointment details";
  return (
    <div className="schedule-page">
      {navigation.guard}
      <PageHeader
        title="Schedule"
        description={`Appointments and the day ahead · ${zone}`}
        actions={
          <button
            ref={newButton}
            className="button"
            disabled={!!workspace || locked}
            onClick={(e) => {
              if (owner.current || lock.current) return;
              opener.current = e.currentTarget;
              replaceWorkspace({ kind: "new", key: crypto.randomUUID() });
            }}
          >
            New appointment
          </button>
        }
      />
      <SetupReminder />
      <section className="panel schedule-panel">
        <div className="schedule-toolbar">
          <div className="schedule-date-nav">
            <div className="schedule-date-picker">
              <h2>{dateHeading(range.first, range.last)}</h2>
              <span aria-hidden="true">⌄</span>
              <input
                aria-label="Clinic date"
                title="Choose date"
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            </div>
            <div className="button-group date-navigation">
              <button
                className="button secondary"
                aria-label="Previous"
                onClick={() => setDate(shiftDate(date, -spanDays))}
              >
                ‹
              </button>
              <button
                className="button secondary"
                onClick={() => setDate(clinicToday(zone))}
              >
                Today
              </button>
              <button
                className="button secondary"
                aria-label="Next"
                onClick={() => setDate(shiftDate(date, spanDays))}
              >
                ›
              </button>
            </div>
          </div>
          <div
            className="button-group schedule-views"
            aria-label="Calendar view"
          >
            {(["day", "week", "list"] as const).map((v) => (
              <button
                key={v}
                className="button secondary"
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
          <div className="schedule-filters">
            <select
              aria-label="Provider filter"
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
            <span className="calendar-zone">Clinic time · {zone}</span>
          </div>
        </div>
        <QueryState query={query}>
          {query.data?.length === 0 ? (
            <EmptyState>No appointments in this period.</EmptyState>
          ) : view !== "list" && !mobile ? (
            <div
              className="calendar-region"
              role="region"
              aria-label="Appointment calendar"
            >
              <Suspense fallback={<p role="status">Loading calendar…</p>}>
                <Calendar
                  date={date}
                  zone={zone}
                  view={view}
                  events={query.data ?? []}
                  onSelect={select}
                />
              </Suspense>
            </div>
          ) : (
            <div className="schedule-list">
              <h2 className="sr-only">Appointment list</h2>
              <div className="appointment-list">
                {query.data?.map((row) => (
                  <button
                    className="appointment-row"
                    key={row.id}
                    disabled={!!workspace || locked}
                    onClick={() => select(row)}
                  >
                    <span className="appointment-time" dir="ltr">
                      <span>
                        {dateHeading(
                          clinicDate(row.starts_at, zone),
                          clinicDate(row.starts_at, zone),
                          true,
                        )}
                      </span>
                      <strong>{timeLabel(row.starts_at, zone)}</strong>
                    </span>
                    <span className="appointment-person" dir="auto">
                      <strong>{row.patient_name}</strong>
                      {row.patient_name_ur && (
                        <small className="urdu" lang="ur" dir="auto">
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
            </div>
          )}
        </QueryState>
        <footer className="calendar-footer">
          All appointment times in {zone}
        </footer>
      </section>
      <Dialog.Root
        open={!!workspace}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content appointment-dialog"
            onEscapeKeyDown={(e) => {
              if (lock.current) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (lock.current) e.preventDefault();
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (opener.current?.isConnected) opener.current.focus();
              else newButton.current?.focus();
            }}
          >
            <div className="appointment-dialog-heading">
              <Dialog.Title>{title}</Dialog.Title>
              <button
                className="button secondary dialog-dismiss"
                aria-label="Close details"
                disabled={locked}
                onClick={close}
              >
                ×
              </button>
            </div>
            <Dialog.Description>
              {workspace?.kind === "new"
                ? "Choose a patient and an available time, then review before confirming."
                : workspace?.kind === "reschedule"
                  ? "Choose an available time. The saved appointment duration is retained."
                  : workspace?.kind === "cancel"
                    ? "Review this appointment before confirming cancellation."
                    : "Review the appointment and patient details."}
            </Dialog.Description>
            {(workspace?.kind === "new" ||
              workspace?.kind === "reschedule") && (
              <AppointmentForm
                key={workspace.key}
                embedded
                date={date}
                zone={zone}
                {...(workspace.kind === "reschedule"
                  ? {
                      appointment: workspace.appointment,
                      appointmentName: workspace.appointment.patient_name,
                    }
                  : {})}
                onLockChange={lockIntent}
                onDone={finish}
              />
            )}
            {selected &&
              (workspace?.kind === "details" ||
                workspace?.kind === "cancel") && (
                <>
                  <div className="appointment-summary">
                    <p className="appointment-summary-name" dir="auto">
                      {selected.patient_name}
                    </p>
                    {selected.patient_name_ur && (
                      <p className="urdu" dir="auto" lang="ur">
                        {selected.patient_name_ur}
                      </p>
                    )}
                    <p dir="auto">
                      {selected.service_name} · {selected.provider_name}
                    </p>
                    <p dir="ltr">
                      {slotLabel(selected.starts_at, zone)} –{" "}
                      {slotLabel(selected.ends_at, zone)} · {zone}
                    </p>
                    <StatusBadge>{selected.status}</StatusBadge>
                  </div>
                  <ErrorSummary error={error} />
                  {workspace?.kind === "details" ? (
                    <>
                      <Link to={`/patients/${selected.patient_id}`}>
                        View patient history
                      </Link>
                      {selected.status === "booked" && (
                        <div className="form-actions">
                          <button
                            className="button"
                            onClick={() => changeKind("reschedule")}
                          >
                            Reschedule
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => changeKind("cancel")}
                          >
                            Confirm cancellation
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {uncertain && (
                        <p className="notice">
                          Outcome uncertain. Retry this same cancellation to
                          resolve it.
                        </p>
                      )}
                      <div className="form-actions">
                        <button
                          className="button secondary"
                          disabled={locked}
                          onClick={() => changeKind("details")}
                        >
                          Cancel
                        </button>
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => void cancel()}
                        >
                          {busy ? "Saving…" : "Confirm cancellation"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
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
