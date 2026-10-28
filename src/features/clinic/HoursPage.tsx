import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "../../app/auth";
import { ContractForm } from "../../components/ui/contract-form";
import {
  PageHeader,
  ErrorSummary,
  EmptyState,
  ConfirmDialog,
} from "../../components/ui/patterns";
import {
  useCatalog,
  useRefreshClinic,
  QueryState,
  useDashboardQuery,
} from "./ClinicPages";
import type {
  RuleOut,
  ExceptionOut,
  AvailabilityTemplate,
  AvailabilityPreview,
} from "../../api/dashboard.generated";
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export function upcomingClosures(exceptions: ExceptionOut[], today: string) {
  const start = Date.parse(today + "T00:00:00Z");
  return exceptions.filter(
    (item) =>
      item.kind === "closed" &&
      Date.parse(item.start_date + "T00:00:00Z") >= start &&
      Date.parse(item.start_date + "T00:00:00Z") <= start + 14 * 86400000,
  );
}
export function HoursPage() {
  const { providers } = useCatalog();
  const [selected, setSelected] = useState("");
  const provider = selected || providers.data?.[0]?.id || "";
  return (
    <>
      <PageHeader
        title="Hours & exceptions"
        description="Provider availability in your clinic’s local timezone."
      />
      <section className="panel toolbar">
        <div className="form-field">
          <label htmlFor="hours-provider">Provider</label>
          <select
            id="hours-provider"
            value={provider}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!provider && <option value="">Select provider</option>}
            {providers.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </section>
      <QueryState query={providers}>
        {provider ? (
          <ProviderHours key={provider} provider={provider} />
        ) : (
          <EmptyState>Add a provider before configuring hours.</EmptyState>
        )}
      </QueryState>
    </>
  );
}
function ProviderHours({ provider }: { provider: string }) {
  const auth = useAuth(),
    refresh = useRefreshClinic();
  const query = useQuery({
    queryKey: useSessionKey("availability", provider),
    queryFn: ({ signal }) =>
      auth.request("GET /dashboard/providers/{identity}/availability", {
        params: { identity: provider },
        signal,
      }),
  });
  const clinic = useDashboardQuery("GET /dashboard/clinic");
  const [rule, setRule] = useState<RuleOut | "new" | null>(null),
    [exception, setException] = useState<ExceptionOut | "new" | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const today = clinic.data
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: clinic.data.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    : "";
  const reminders = upcomingClosures(query.data?.exceptions ?? [], today);
  async function remove(kind: "rule" | "exception", identity: string) {
    setBusy(true);
    setError(null);
    try {
      await auth.request(
        kind === "rule"
          ? "DELETE /availability-rules/{identity}"
          : "DELETE /exceptions/{identity}",
        { params: { identity } },
      );
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ErrorSummary error={error} />
      {auth.isManager && reminders.length > 0 && (
        <aside className="notice">
          <strong>Upcoming configured closures</strong>
          <p>
            Review provider hours before these manually entered dates:{" "}
            {reminders
              .map((item) => `${item.start_date} – ${item.end_date}`)
              .join(", ")}
            . Holiday dates are never inferred.
          </p>
        </aside>
      )}
      <QueryState query={query}>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Weekly hours</h2>
              <p>{clinic.data?.timezone}</p>
            </div>
            {auth.isManager && (
              <button
                className="button secondary"
                onClick={() => setRule("new")}
              >
                Add interval
              </button>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Working interval</th>
                  <th>Slot spacing</th>
                  {auth.isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {query.data?.rules.map((item) => (
                  <tr key={item.id}>
                    <td>{weekdays[item.weekday - 1]}</td>
                    <td dir="ltr">
                      {item.start_time} – {item.end_time}
                    </td>
                    <td>{item.slot_min} min</td>
                    {auth.isManager && (
                      <td className="row-actions">
                        <button
                          className="button secondary"
                          onClick={() => setRule(item)}
                        >
                          Edit
                        </button>
                        <ConfirmDialog
                          title="Remove availability interval?"
                          confirm="Remove"
                          busy={busy}
                          onConfirm={() => remove("rule", item.id)}
                        >
                          Existing appointments keep their booked times. New
                          slots will follow the remaining hours.
                        </ConfirmDialog>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data?.rules.length && (
            <EmptyState>
              No weekly availability. Add an interval to offer booking slots.
            </EmptyState>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Date exceptions</h2>
              <p>Enter holiday dates manually, or set custom hours.</p>
            </div>
            {auth.isManager && (
              <button
                className="button secondary"
                onClick={() => setException("new")}
              >
                Add exception
              </button>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dates</th>
                  <th>Hours</th>
                  {auth.isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {query.data?.exceptions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.start_date} – {item.end_date}
                    </td>
                    <td>
                      {item.kind === "closed"
                        ? "Closed"
                        : `${item.start_time} – ${item.end_time}`}
                    </td>
                    {auth.isManager && (
                      <td className="row-actions">
                        <button
                          className="button secondary"
                          onClick={() => setException(item)}
                        >
                          Edit
                        </button>
                        <ConfirmDialog
                          title="Remove date exception?"
                          confirm="Remove"
                          busy={busy}
                          onConfirm={() => remove("exception", item.id)}
                        >
                          These dates will return to the provider’s ordinary
                          weekly hours.
                        </ConfirmDialog>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data?.exceptions.length && (
            <EmptyState>No date exceptions configured.</EmptyState>
          )}
        </section>
      </QueryState>
      {rule && auth.isManager && (
        <section className="panel">
          <h2>{rule === "new" ? "Add interval" : "Edit interval"}</h2>
          <ContractForm
            key={rule === "new" ? "new" : rule.id}
            schema="RuleCreate"
            initial={rule === "new" ? { provider_id: provider } : rule}
            fields={{
              provider_id: { hidden: true },
              weekday: {
                label: "Weekday",
                choices: weekdays.map((label, index) => ({
                  label,
                  value: String(index + 1),
                })),
              },
              slot_min: { label: "Slot spacing (minutes)" },
            }}
            onSave={async (body) => {
              if (rule === "new")
                await auth.request("POST /availability-rules", { body });
              else
                await auth.request("PUT /availability-rules/{identity}", {
                  params: { identity: rule.id },
                  body,
                });
              await refresh();
            }}
            onSaved={() => setRule(null)}
          />
          <button className="button secondary" onClick={() => setRule(null)}>
            Close editor
          </button>
        </section>
      )}
      {exception && auth.isManager && (
        <section className="panel">
          <h2>{exception === "new" ? "Add exception" : "Edit exception"}</h2>
          <ContractForm
            key={exception === "new" ? "new" : exception.id}
            schema="ExceptionCreate"
            initial={
              exception === "new"
                ? { provider_id: provider, kind: "closed" }
                : exception
            }
            fields={{
              provider_id: { hidden: true },
              kind: {
                choices: [
                  { value: "closed", label: "Closed" },
                  { value: "custom", label: "Custom hours" },
                ],
              },
              start_time: {
                help: "Required only for custom hours. Leave blank for closure.",
              },
              end_time: {
                help: "Required only for custom hours. Leave blank for closure.",
              },
            }}
            onSave={async (body) => {
              if (exception === "new")
                await auth.request("POST /exceptions", { body });
              else
                await auth.request("PUT /exceptions/{identity}", {
                  params: { identity: exception.id },
                  body,
                });
              await refresh();
            }}
            onSaved={() => setException(null)}
          />
          <button
            className="button secondary"
            onClick={() => setException(null)}
          >
            Close editor
          </button>
        </section>
      )}
      {auth.isManager && query.data && (
        <TemplateEditor provider={provider} revision={query.data.revision} />
      )}
    </>
  );
}
function TemplateEditor({
  provider,
  revision,
}: {
  provider: string;
  revision: string;
}) {
  const auth = useAuth(),
    refresh = useRefreshClinic();
  const [template, setTemplate] = useState<"friday_prayer" | "ramadan">(
    "friday_prayer",
  );
  const [review, setReview] = useState<{
    body: AvailabilityTemplate;
    preview: AvailabilityPreview;
    key: string;
  } | null>(null);
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Availability templates</h2>
      <p>
        Review the server’s proposed changes before applying. Other days and
        providers are preserved.
      </p>
      <ErrorSummary error={error} />
      <div className="segmented" role="group" aria-label="Template">
        <button
          className="button secondary"
          aria-pressed={template === "friday_prayer"}
          onClick={() => {
            setTemplate("friday_prayer");
            setReview(null);
          }}
        >
          Friday prayer
        </button>
        <button
          className="button secondary"
          aria-pressed={template === "ramadan"}
          onClick={() => {
            setTemplate("ramadan");
            setReview(null);
          }}
        >
          Ramadan hours
        </button>
      </div>
      {!review ? (
        <ContractForm
          key={`${template}-${revision}`}
          schema="AvailabilityTemplate"
          initial={{
            revision,
            template,
            ...(template === "friday_prayer"
              ? { break_start: "12:45:00", break_end: "14:30:00" }
              : {}),
          }}
          fields={{
            revision: { hidden: true },
            template: { hidden: true },
            break_start: {
              hidden: template === "ramadan",
              label: "Prayer break starts",
            },
            break_end: {
              hidden: template === "ramadan",
              label: "Prayer break ends",
            },
            start_date: {
              hidden: template === "friday_prayer",
              help: "Explicit local date. No lunar calendar dates are inferred.",
            },
            end_date: { hidden: template === "friday_prayer" },
            start_time: { hidden: template === "friday_prayer" },
            end_time: { hidden: template === "friday_prayer" },
          }}
          submitLabel="Preview changes"
          onSave={async (body) => {
            setError(null);
            const preview = await auth.request(
              "POST /dashboard/providers/{identity}/availability/preview",
              { params: { identity: provider }, body },
            );
            setReview({ body, preview, key: crypto.randomUUID() });
          }}
        />
      ) : (
        <div className="template-review">
          <h3>Review proposed changes</h3>
          <p>
            {review.preview.changes.removed_rule_ids.length} intervals replaced
            · {review.preview.changes.added_rules.length} intervals added ·{" "}
            {review.preview.changes.added_exceptions.length} exceptions added
          </p>
          <ul>
            {review.preview.changes.added_rules.map((r, index) => (
              <li key={index}>
                {weekdays[r.weekday - 1]}: {r.start_time} – {r.end_time}
              </li>
            ))}
            {review.preview.changes.added_exceptions.map((e, index) => (
              <li key={index}>
                {e.start_date} – {e.end_date}: {e.start_time} – {e.end_time}
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setReview(null)}
            >
              Edit proposal
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await auth.request(
                    "POST /dashboard/providers/{identity}/availability/apply",
                    {
                      params: { identity: provider },
                      body: review.body,
                      idempotencyKey: review.key,
                    },
                  );
                  setReview(null);
                  await refresh();
                } catch (e) {
                  setError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Applying…" : "Apply reviewed changes"}
            </button>
          </div>
          <p className="muted">
            Retries reuse this review’s idempotency key. If hours changed, edit
            and preview again.
          </p>
        </div>
      )}
    </section>
  );
}
