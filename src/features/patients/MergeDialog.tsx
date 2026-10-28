import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useAuth, useSessionKey } from "../../app/auth";
import type {
  Merge,
  PatientDetail,
  RetainedFields,
} from "../../api/dashboard.generated";
import { DashboardError } from "../../api/dashboard";
import { useRefreshClinic } from "../clinic/ClinicPages";
import { ErrorSummary } from "../../components/ui/patterns";
import { PatientSearch } from "./PatientSearch";
const fields = ["name", "name_ur", "phone", "dob"] as const;
type Field = (typeof fields)[number];
export function MergeDialog({
  source: initialSource,
  onClose,
}: {
  source: PatientDetail;
  onClose: () => void;
}) {
  const labels = {
    name: "Name",
    name_ur: "Urdu name",
    phone: "Phone",
    dob: "Date of birth",
  };
  const [source] = useState(initialSource);
  const auth = useAuth(),
    refresh = useRefreshClinic(),
    navigate = useNavigate();
  const [destination, setDestination] = useState<PatientDetail | null>(null),
    [choices, setChoices] = useState<
      Partial<Record<Field, "source" | "destination" | "clear">>
    >({}),
    [review, setReview] = useState<{ body: Merge; key: string } | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const counts = useQuery({
    queryKey: useSessionKey("merge-counts", undefined, {
      source: source.id,
      destination: destination?.id,
    }),
    enabled: !!destination,
    queryFn: async ({ signal }) => {
      async function count(id: string) {
        let total = 0;
        for (let offset = 0; ; offset += 100) {
          const page = await auth.request(
            "GET /patients/{patient_id}/appointments",
            {
              params: { patient_id: id },
              query: { limit: 100, offset },
              signal,
            },
          );
          total += page.length;
          if (page.length < 100) return total;
        }
      }
      return Promise.all([count(source.id), count(destination!.id)]);
    },
  });
  if (!auth.isManager) return null;
  function prepare() {
    if (!destination || !fields.every((f) => choices[f]) || !counts.data)
      return;
    const retained: RetainedFields = {
      name: choices.name === "source" ? source.name : destination.name,
      phone: choices.phone === "source" ? source.phone : destination.phone,
      name_ur:
        choices.name_ur === "clear"
          ? null
          : ((choices.name_ur === "source"
              ? source.name_ur
              : destination.name_ur) ?? null),
      dob:
        choices.dob === "clear"
          ? null
          : ((choices.dob === "source" ? source.dob : destination.dob) ?? null),
    };
    setReview({
      body: {
        destination_id: destination.id,
        source_revision: source.revision,
        destination_revision: destination.revision,
        fields: retained,
      },
      key: crypto.randomUUID(),
    });
  }
  async function confirm() {
    if (!review) return;
    setBusy(true);
    setError(null);
    try {
      const retained = await auth.request(
        "POST /dashboard/patients/{source_id}/merge",
        {
          params: { source_id: source.id },
          body: review.body,
          idempotencyKey: review.key,
        },
      );
      await refresh();
      onClose();
      void navigate(`/patients/${retained.id}`);
    } catch (e) {
      setError(e);
      setUncertain(
        !(e instanceof DashboardError) || e.status >= 500 || e.status === 408,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy && !uncertain) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content merge-dialog"
          onEscapeKeyDown={(e) => {
            if (busy || uncertain) e.preventDefault();
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Dialog.Title>Merge patient records</Dialog.Title>
          <Dialog.Description>
            Explicitly select the destination and every retained field. Shared
            phones do not prove two records belong to one person. Appointments
            move to the destination; the source remains a read-only link.
          </Dialog.Description>
          <ErrorSummary error={error ?? counts.error} />
          {error instanceof DashboardError && error.status === 409 && (
            <button
              className="button secondary"
              onClick={() => {
                void refresh().then(onClose);
              }}
            >
              Reload current records before another merge
            </button>
          )}
          <p dir="auto">
            Source: {source.name} · {source.phone} · revision {source.revision}
          </p>
          <fieldset disabled={busy || !!review} hidden={!!review}>
            <PatientSearch
              exclude={source.id}
              onSelect={(p) => {
                setDestination(p);
                setChoices({});
              }}
            />
            {destination && (
              <>
                <p dir="auto">
                  Destination: {destination.name} · {destination.phone} ·
                  revision {destination.revision}
                </p>
                <p>
                  {counts.data
                    ? `${counts.data[0]} source appointments will move; ${counts.data[1]} destination appointments will remain.`
                    : "Loading affected appointments…"}
                </p>
                {fields.map((field) => (
                  <div className="form-field" key={field}>
                    <label htmlFor={`retain-${field}`}>
                      Retain{" "}
                      {field === "name_ur"
                        ? "Urdu name"
                        : field === "dob"
                          ? "date of birth"
                          : field}
                    </label>
                    <select
                      id={`retain-${field}`}
                      value={choices[field] ?? ""}
                      onChange={(e) =>
                        setChoices({
                          ...choices,
                          [field]: e.target.value as
                            "source" | "destination" | "clear",
                        })
                      }
                    >
                      <option value="">Choose retained value</option>
                      <option value="source">
                        Source: {source[field] ?? "Not recorded"}
                      </option>
                      <option value="destination">
                        Destination: {destination[field] ?? "Not recorded"}
                      </option>
                      {(field === "name_ur" || field === "dob") && (
                        <option value="clear">
                          Clear value (not recorded)
                        </option>
                      )}
                    </select>
                  </div>
                ))}
              </>
            )}
            <button
              className="button"
              disabled={
                !destination || !counts.data || !fields.every((f) => choices[f])
              }
              onClick={prepare}
            >
              Review merge
            </button>
          </fieldset>
          {review && (
            <section className="review-panel">
              <h3>Confirm retained record</h3>
              <p dir="auto">
                Destination: {destination?.name} · {destination?.phone} ·
                revision {review.body.destination_revision}
              </p>
              <p>
                {counts.data?.[0]} source appointments move to the destination;{" "}
                {counts.data?.[1]} destination appointments remain.
              </p>
              <dl>
                {fields.map((f) => (
                  <div key={f}>
                    <dt>{labels[f]}</dt>
                    <dd dir="auto">
                      {review.body.fields[f] ?? "Not recorded"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>
                Both captured revisions will be checked by the server. A
                conflict requires reviewing current records.
              </p>
              {uncertain && (
                <p>Outcome uncertain. Retry this exact merge to resolve it.</p>
              )}
              <button
                className="button danger"
                disabled={busy}
                onClick={() => void confirm()}
              >
                Confirm merge
              </button>
              <button
                className="button secondary"
                disabled={busy || uncertain}
                onClick={() => {
                  setReview(null);
                  setError(null);
                }}
              >
                Back to retained fields
              </button>
            </section>
          )}
          <button
            className="button secondary"
            disabled={busy || uncertain}
            onClick={onClose}
          >
            Close merge
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
