import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "../../app/auth";
import { DashboardError } from "../../api/dashboard";
import type {
  AppointmentOut,
  Book,
  PatientDetail,
  Slot,
} from "../../api/dashboard.generated";
import {
  useCatalog,
  useRefreshClinic,
  QueryState,
} from "../clinic/ClinicPages";
import { PatientSearch } from "../patients/PatientSearch";
import { ErrorSummary } from "../../components/ui/patterns";
import { slotLabel } from "./dates";
import { Temporal } from "temporal-polyfill";
export function AppointmentForm({
  zone,
  date,
  appointment,
  appointmentName,
  onDone,
  onLockChange,
  embedded = false,
}: {
  zone: string;
  date: string;
  appointment?: AppointmentOut;
  appointmentName?: string;
  onDone: () => void;
  onLockChange?: (locked: boolean) => void;
  embedded?: boolean;
}) {
  const auth = useAuth(),
    refresh = useRefreshClinic(),
    catalog = useCatalog();
  const [patient, setPatient] = useState<PatientDetail | null>(null),
    [provider, setProvider] = useState(appointment?.provider_id ?? ""),
    [service, setService] = useState(appointment?.service_id ?? ""),
    [day, setDay] = useState(date),
    [slot, setSlot] = useState<Slot | null>(null);
  const [review, setReview] = useState<{
      body: Book;
      key: string;
      endsAt: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [uncertain, setUncertain] = useState(false);
  const slots = useQuery({
    queryKey: useSessionKey("GET /slots", undefined, {
      provider,
      service,
      day,
    }),
    queryFn: ({ signal }) =>
      auth.request("GET /slots", {
        query: {
          provider_id: provider,
          service_id: service,
          date_from: day,
          date_to: day,
          limit: 100,
        },
        signal,
      }),
    enabled: !!provider && !!service && !!day,
  });
  const reviewTitle = useRef<HTMLHeadingElement>(null),
    reviewTrigger = useRef<HTMLButtonElement>(null),
    hadReview = useRef(false);
  useEffect(() => {
    if (review && !hadReview.current) reviewTitle.current?.focus();
    else if (!review && hadReview.current && !error)
      reviewTrigger.current?.focus();
    hadReview.current = !!review;
  }, [review, error]);
  const locked = busy || !!review;
  async function confirm() {
    if (!review) return;
    onLockChange?.(true);
    setBusy(true);
    setError(null);
    try {
      if (appointment)
        await auth.request("POST /appointments/{identity}/reschedule", {
          params: { identity: appointment.id },
          body: {
            confirmed: true,
            starts_at: review.body.starts_at,
            provider_id: review.body.provider_id,
          },
          idempotencyKey: review.key,
        });
      else
        await auth.request("POST /appointments", {
          body: review.body,
          idempotencyKey: review.key,
        });
      await refresh();
      onDone();
    } catch (e) {
      setError(e);
      const unknownOutcome =
        !(e instanceof DashboardError) || e.status >= 500 || e.status === 408;
      setUncertain(unknownOutcome);
      onLockChange?.(unknownOutcome);
      if (!unknownOutcome) {
        setReview(null);
        setSlot(null);
        await slots.refetch();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={embedded ? "appointment-form" : "panel editor"}>
      {!embedded && (
        <h2>{appointment ? "Reschedule appointment" : "New appointment"}</h2>
      )}
      <p>Times in {zone}. Availability is checked again when confirmed.</p>
      <ErrorSummary
        error={error ?? catalog.providers.error ?? catalog.services.error}
      />
      {error instanceof DashboardError && error.alternatives.length > 0 && (
        <section aria-label="Server alternatives">
          <h3>Available alternatives returned by the server</h3>
          {error.alternatives.map((s) => (
            <button
              type="button"
              className="button secondary"
              key={s.starts_at}
              disabled={locked}
              onClick={() => {
                setProvider(s.provider_id);
                setService(s.service_id);
                setSlot(s);
                setDay(
                  Temporal.Instant.from(s.starts_at)
                    .toZonedDateTimeISO(zone)
                    .toPlainDate()
                    .toString(),
                );
              }}
            >
              {slotLabel(s.starts_at, zone)}
            </button>
          ))}
        </section>
      )}
      <fieldset disabled={locked} hidden={!!review}>
        {!appointment && (
          <>
            <PatientSearch onSelect={setPatient} />
            {patient && (
              <p role="status" dir="auto">
                Selected patient:{" "}
                <bdi dir="auto">
                  {patient.name} {patient.name_ur}
                </bdi>{" "}
                · <bdi dir="ltr">{patient.phone}</bdi>
              </p>
            )}
          </>
        )}
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="booking-provider">Provider</label>
            <select
              id="booking-provider"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setSlot(null);
              }}
            >
              <option value="">Select provider</option>
              {catalog.providers.data
                ?.filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="booking-service">Service</label>
            <select
              id="booking-service"
              disabled={!!appointment}
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                setSlot(null);
              }}
            >
              <option value="">Select service</option>
              {catalog.services.data
                ?.filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="booking-date">Appointment date</label>
            <input
              id="booking-date"
              type="date"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setSlot(null);
              }}
            />
          </div>
        </div>
        {!!provider && !!service && (
          <QueryState query={slots}>
            <fieldset>
              <legend>Available slots</legend>
              <div className="slot-options">
                {slots.data?.map((s) => (
                  <label key={s.starts_at}>
                    <input
                      type="radio"
                      name="slot"
                      checked={slot?.starts_at === s.starts_at}
                      onChange={() => setSlot(s)}
                    />
                    <span dir="ltr">{slotLabel(s.starts_at, zone)}</span>
                  </label>
                ))}
              </div>
              {slots.data?.length === 0 && (
                <p>No slots available. Choose another date or provider.</p>
              )}
              {slots.data?.length === 100 && (
                <p>Showing the first 100 slots for this day.</p>
              )}
            </fieldset>
          </QueryState>
        )}
        <button
          className="button"
          type="button"
          ref={reviewTrigger}
          disabled={!slot || (!appointment && !patient)}
          onClick={() => {
            setError(null);
            if (slot)
              setReview({
                body: {
                  confirmed: true,
                  patient_id: appointment?.patient_id ?? patient!.id,
                  provider_id: slot.provider_id,
                  service_id: slot.service_id,
                  starts_at: slot.starts_at,
                },
                key: crypto.randomUUID(),
                endsAt: appointment
                  ? new Date(
                      Date.parse(slot.starts_at) +
                        Date.parse(appointment.ends_at) -
                        Date.parse(appointment.starts_at),
                    ).toISOString()
                  : slot.ends_at,
              });
          }}
        >
          Review appointment
        </button>
      </fieldset>
      {review && (
        <section className="review-panel" aria-label="Review appointment">
          <h3 ref={reviewTitle} tabIndex={-1}>
            Review appointment
          </h3>
          <p dir="auto">
            {patient?.name ?? appointmentName ?? "Existing patient"} ·{" "}
            {
              catalog.providers.data?.find(
                (p) => p.id === review.body.provider_id,
              )?.name
            }{" "}
            ·{" "}
            {
              catalog.services.data?.find(
                (s) => s.id === review.body.service_id,
              )?.name
            }
          </p>
          <p dir="ltr">
            {slotLabel(review.body.starts_at, zone)} –{" "}
            {slotLabel(review.endsAt, zone)} · {zone}
          </p>
          {appointment && (
            <p>
              Original appointment duration is retained. The server checks
              availability using the saved appointment.
            </p>
          )}
          {uncertain && (
            <p>
              The outcome is uncertain. Retry this exact confirmation before
              making another booking.
            </p>
          )}
          <button
            className="button"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? "Confirming…" : "Confirm appointment"}
          </button>
          <button
            className="button secondary"
            disabled={busy || uncertain}
            onClick={() => setReview(null)}
          >
            Edit selection
          </button>
        </section>
      )}
      <button
        className="button secondary"
        disabled={busy || uncertain}
        onClick={onDone}
      >
        Close appointment form
      </button>
    </section>
  );
}
