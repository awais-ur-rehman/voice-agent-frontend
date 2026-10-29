import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "../../app/auth";
import { ContractForm } from "../../components/ui/contract-form";
import {
  PageHeader,
  ErrorSummary,
  EmptyState,
  StatusBadge,
  ConfirmDialog,
} from "../../components/ui/patterns";
import type { Operation, RequestOptions, Result } from "../../api/dashboard";
import type { ProviderOut, ServiceOut } from "../../api/dashboard.generated";
export function useDashboardQuery<K extends Operation>(
  operation: K,
  options: RequestOptions<K> = {},
) {
  const auth = useAuth();
  return useQuery({
    queryKey: useSessionKey(operation, options.params, options.query),
    queryFn: ({ signal }) => auth.request(operation, { ...options, signal }),
  });
}
export function useRefreshClinic() {
  const client = useQueryClient();
  const key = useSessionKey();
  return () => client.invalidateQueries({ queryKey: key });
}
export function QueryState({
  query,
  children,
}: {
  query: { isPending: boolean; error: unknown; data?: unknown };
  children: ReactNode;
}) {
  if (query.data === undefined)
    return query.isPending ? (
      <p role="status" className="empty-state">
        Loading…
      </p>
    ) : (
      <ErrorSummary error={query.error} />
    );
  return (
    <>
      <ErrorSummary error={query.error} />
      {children}
    </>
  );
}
export function SetupPage() {
  const query = useDashboardQuery("GET /dashboard/setup");
  const links = {
    profile: "/clinic",
    providers: "/providers",
    services: "/services",
    hours: "/hours",
    agent: "/agents",
  };
  return (
    <>
      <PageHeader
        title="Set up your clinic"
        description="Your progress reflects the configuration saved in this workspace."
      />
      <section className="panel">
        <QueryState query={query}>
          {query.data && (
            <ul className="setup-list">
              {Object.entries(query.data).map(([key, done]) => (
                <li key={key}>
                  <span className={`check ${done ? "complete" : ""}`}>
                    {done ? "✓" : "○"}
                  </span>
                  <div>
                    <strong>
                      {key === "profile"
                        ? "Clinic profile"
                        : key.charAt(0).toUpperCase() + key.slice(1)}
                    </strong>
                    <p>{done ? "Configured" : "Needs configuration"}</p>
                  </div>
                  {key in links ? (
                    <Link
                      className="button secondary"
                      to={links[key as keyof typeof links]}
                    >
                      Review
                    </Link>
                  ) : (
                    <StatusBadge>
                      {done ? "Configured" : "Agent setup is not available yet"}
                    </StatusBadge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </section>
    </>
  );
}
export function ClinicPage() {
  const auth = useAuth();
  const query = useDashboardQuery("GET /dashboard/clinic");
  const refresh = useRefreshClinic();
  const [timezoneReview, setTimezoneReview] = useState<{
    from: string;
    to: string;
    resolve: (accepted: boolean) => void;
  } | null>(null);
  const finishTimezoneReview = (accepted: boolean) => {
    timezoneReview?.resolve(accepted);
    setTimezoneReview(null);
  };
  return (
    <>
      <PageHeader
        title="Clinic profile"
        description="Clinic details, patient preparation and booking policy."
      />
      {!auth.isManager && (
        <p className="notice">
          You have read-only access. Contact an owner or admin to change
          configuration.
        </p>
      )}
      <section className="panel">
        <QueryState query={query}>
          {query.data && (
            <ContractForm
              schema="ProfilePatch"
              key={query.data.id}
              initial={{ ...query.data, confirm_timezone_change: false }}
              disabled={!auth.isManager}
              beforeSave={async (body, original) => {
                if (!body.timezone || body.timezone === original.timezone)
                  return { ...body, confirm_timezone_change: false };
                const accepted = await new Promise<boolean>((resolve) =>
                  setTimezoneReview({
                    from: String(original.timezone),
                    to: body.timezone!,
                    resolve,
                  }),
                );
                return accepted
                  ? { ...body, confirm_timezone_change: true }
                  : null;
              }}
              onSave={async (body) => {
                const result = await auth.request("PATCH /dashboard/clinic", {
                  body,
                });
                await refresh();
                return result;
              }}
              fields={{
                revision: { hidden: true },
                address_en: { label: "Address · English", multiline: true },
                address_ur: { label: "Address · Urdu", multiline: true },
                preparation_en: {
                  label: "Preparation · English",
                  multiline: true,
                },
                preparation_ur: {
                  label: "Preparation · Urdu",
                  multiline: true,
                },
                timezone: {
                  label: "Clinic timezone",
                  help: "Use an IANA zone, for example Asia/Karachi.",
                },
                confirm_timezone_change: {
                  hidden: true,
                },
                min_notice_min: { label: "Minimum notice (minutes)" },
                cancellation_min: { label: "Cancellation notice (minutes)" },
                horizon_days: { label: "Booking horizon (days)" },
                daily_limit: { label: "Daily booking limit" },
              }}
            />
          )}
        </QueryState>
      </section>
      <Dialog.Root
        open={!!timezoneReview}
        onOpenChange={(open) => {
          if (!open) finishTimezoneReview(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Review clinic timezone change</Dialog.Title>
            <Dialog.Description>
              Change {timezoneReview?.from} → {timezoneReview?.to}. Booked
              appointments stay at the same time; their displayed clinic-local
              time may change.
            </Dialog.Description>
            <div className="form-actions">
              <button
                className="button secondary"
                onClick={() => finishTimezoneReview(false)}
              >
                Cancel
              </button>
              <button
                className="button"
                onClick={() => finishTimezoneReview(true)}
              >
                Confirm timezone change
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
export async function allPages<K extends "GET /providers" | "GET /services">(
  request: <O extends Operation>(
    operation: O,
    options?: RequestOptions<O>,
  ) => Promise<Result<O>>,
  operation: K,
  signal: AbortSignal,
): Promise<Result<K>> {
  const items: Array<ProviderOut | ServiceOut> = [];
  for (let offset = 0; ; offset += 100) {
    const page = await request(operation, {
      query: { limit: 100, offset },
      signal,
    });
    items.push(...page);
    if (page.length < 100) return items as Result<K>;
  }
}
export function useCatalog() {
  const { request } = useAuth();
  const providers = useQuery({
    queryKey: useSessionKey("all-providers"),
    queryFn: ({ signal }) => allPages(request, "GET /providers", signal),
  });
  const services = useQuery({
    queryKey: useSessionKey("all-services"),
    queryFn: ({ signal }) => allPages(request, "GET /services", signal),
  });
  return { providers, services };
}
function Pager({
  offset,
  setOffset,
  count,
}: {
  offset: number;
  setOffset: (n: number) => void;
  count: number;
}) {
  return (
    <div className="pagination">
      <button
        className="button secondary"
        disabled={!offset}
        onClick={() => setOffset(Math.max(0, offset - 25))}
      >
        Previous
      </button>
      <span>Page {offset / 25 + 1}</span>
      <button
        className="button secondary"
        disabled={count < 25}
        onClick={() => setOffset(offset + 25)}
      >
        Next
      </button>
    </div>
  );
}
export function ProvidersPage() {
  const auth = useAuth(),
    refresh = useRefreshClinic();
  const [offset, setOffset] = useState(0),
    [editing, setEditing] = useState<ProviderOut | "new" | null>(null);
  const query = useDashboardQuery("GET /providers", {
    query: { limit: 25, offset },
  });
  return (
    <>
      <PageHeader
        title="Providers"
        description="Manage your care team and available services."
        actions={
          auth.isManager && (
            <button className="button" onClick={() => setEditing("new")}>
              Add provider
            </button>
          )
        }
      />
      <section className="panel">
        <QueryState query={query}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Specialty</th>
                  <th>Status</th>
                  {auth.isManager && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {query.data?.map((row) => (
                  <tr key={row.id}>
                    <td dir="auto">
                      <strong>{row.name}</strong>
                      {row.name_ur && (
                        <small className="urdu" lang="ur" dir="auto">
                          {row.name_ur}
                        </small>
                      )}
                    </td>
                    <td>{row.specialty || "—"}</td>
                    <td>
                      <StatusBadge>
                        {row.active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    {auth.isManager && (
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setEditing(row)}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data?.length && (
            <EmptyState>No providers have been added.</EmptyState>
          )}
          <Pager
            offset={offset}
            setOffset={setOffset}
            count={query.data?.length ?? 0}
          />
        </QueryState>
      </section>
      {editing && auth.isManager && (
        <section className="panel editor">
          <h2>{editing === "new" ? "Add provider" : "Edit provider"}</h2>
          {editing === "new" ? (
            <ContractForm
              key="new"
              schema="ProviderCreate"
              onSave={async (body) => {
                await auth.request("POST /providers", { body });
                await refresh();
              }}
              onSaved={() => setEditing(null)}
            />
          ) : (
            <ContractForm
              key={editing.id}
              schema="ProviderPatch"
              initial={editing}
              onSave={async (body) => {
                await auth.request("PATCH /providers/{identity}", {
                  params: { identity: editing.id },
                  body,
                });
                await refresh();
              }}
              onSaved={() => setEditing(null)}
            />
          )}
          <button className="button secondary" onClick={() => setEditing(null)}>
            Close editor
          </button>
        </section>
      )}
      <Relationships />
    </>
  );
}
function Relationships() {
  const auth = useAuth(),
    refresh = useRefreshClinic();
  const { providers, services } = useCatalog();
  const [provider, setProvider] = useState(""),
    [service, setService] = useState(""),
    [offset, setOffset] = useState(0),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const query = useDashboardQuery("GET /dashboard/provider-services", {
    query: { limit: 25, offset },
  });
  async function change(method: "PUT" | "DELETE", p: string, s: string) {
    setBusy(true);
    setError(null);
    try {
      await auth.request(
        `${method} /providers/{provider_id}/services/{service_id}`,
        { params: { provider_id: p, service_id: s } },
      );
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Provider services</h2>
      <p>Assign the services each provider can deliver.</p>
      <ErrorSummary error={error ?? providers.error ?? services.error} />
      <QueryState query={query}>
        <div className="relationship-list">
          {query.data?.items.map((row) => (
            <div
              className="relationship-row"
              key={`${row.provider_id}-${row.service_id}`}
            >
              <span dir="auto">
                {providers.data?.find((p) => p.id === row.provider_id)?.name ??
                  row.provider_id}
              </span>
              <span dir="auto">
                {services.data?.find((s) => s.id === row.service_id)?.name ??
                  row.service_id}
              </span>
              {auth.isManager && (
                <ConfirmDialog
                  title="Remove service assignment?"
                  confirm="Remove"
                  busy={busy}
                  onConfirm={() =>
                    change("DELETE", row.provider_id, row.service_id)
                  }
                >
                  The provider will no longer offer this service for new
                  bookings.
                </ConfirmDialog>
              )}
            </div>
          ))}
        </div>
        {!query.data?.items.length && (
          <EmptyState>No service assignments yet.</EmptyState>
        )}
        <Pager
          offset={offset}
          setOffset={setOffset}
          count={query.data?.items.length ?? 0}
        />
      </QueryState>
      {auth.isManager && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void change("PUT", provider, service);
          }}
          className="inline-form"
        >
          <div className="form-field">
            <label htmlFor="relationship-provider">Provider</label>
            <select
              id="relationship-provider"
              value={provider}
              required
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="">Select provider</option>
              {providers.data
                ?.filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="relationship-service">Service</label>
            <select
              id="relationship-service"
              value={service}
              required
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">Select service</option>
              {services.data
                ?.filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <button className="button" disabled={busy || !provider || !service}>
            Assign service
          </button>
        </form>
      )}
    </section>
  );
}
export function ServicesPage() {
  const auth = useAuth(),
    refresh = useRefreshClinic();
  const [offset, setOffset] = useState(0),
    [editing, setEditing] = useState<ServiceOut | "new" | null>(null);
  const query = useDashboardQuery("GET /services", {
    query: { limit: 25, offset },
  });
  const fields = {
    duration_min: { label: "Duration (minutes)" },
    buffer_before_min: { label: "Buffer before (minutes)" },
    buffer_after_min: { label: "Buffer after (minutes)" },
    price: { help: "Amount in the clinic’s configured currency." },
  };
  return (
    <>
      <PageHeader
        title="Services"
        description="Appointment durations, buffers and prices."
        actions={
          auth.isManager && (
            <button className="button" onClick={() => setEditing("new")}>
              Add service
            </button>
          )
        }
      />
      <section className="panel">
        <QueryState query={query}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Status</th>
                  {auth.isManager && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {query.data?.map((row) => (
                  <tr key={row.id}>
                    <td dir="auto">
                      <strong>{row.name}</strong>
                      {row.name_ur && (
                        <small className="urdu" lang="ur" dir="auto">
                          {row.name_ur}
                        </small>
                      )}
                    </td>
                    <td>{row.duration_min} min</td>
                    <td>{row.price ?? "0"}</td>
                    <td>
                      <StatusBadge>
                        {row.active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    {auth.isManager && (
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setEditing(row)}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data?.length && (
            <EmptyState>No services have been added.</EmptyState>
          )}
          <Pager
            offset={offset}
            setOffset={setOffset}
            count={query.data?.length ?? 0}
          />
        </QueryState>
      </section>
      {editing && auth.isManager && (
        <section className="panel editor">
          <h2>{editing === "new" ? "Add service" : "Edit service"}</h2>
          {editing === "new" ? (
            <ContractForm
              key="new"
              schema="ServiceCreate"
              fields={fields}
              onSave={async (body) => {
                await auth.request("POST /services", { body });
                await refresh();
              }}
              onSaved={() => setEditing(null)}
            />
          ) : (
            <ContractForm
              key={editing.id}
              schema="ServicePatch"
              fields={fields}
              initial={editing}
              onSave={async (body) => {
                await auth.request("PATCH /services/{identity}", {
                  params: { identity: editing.id },
                  body,
                });
                await refresh();
              }}
              onSaved={() => setEditing(null)}
            />
          )}
          <button className="button secondary" onClick={() => setEditing(null)}>
            Close editor
          </button>
        </section>
      )}
    </>
  );
}
export function StaffPage() {
  const auth = useAuth();
  return auth.isManager ? <StaffManager /> : <Navigate to="/clinic" replace />;
}
function StaffManager() {
  const auth = useAuth(),
    refresh = useRefreshClinic();
  const [offset, setOffset] = useState(0),
    [adding, setAdding] = useState(false);
  const query = useDashboardQuery("GET /users", {
    query: { limit: 25, offset },
  });
  return (
    <>
      <PageHeader
        title="Team access"
        description="Staff can manage bookings. Admins can also configure the clinic."
        actions={
          <button className="button" onClick={() => setAdding(true)}>
            Add team member
          </button>
        }
      />
      <section className="panel">
        <QueryState query={query}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>
                      <StatusBadge>{user.role}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            offset={offset}
            setOffset={setOffset}
            count={query.data?.length ?? 0}
          />
        </QueryState>
      </section>
      {adding && (
        <section className="panel">
          <h2>Add team member</h2>
          <ContractForm
            schema="UserCreate"
            initial={{ role: "staff" }}
            fields={{
              role: {
                choices:
                  auth.me?.role === "owner"
                    ? [
                        { value: "staff", label: "Staff" },
                        { value: "admin", label: "Admin" },
                      ]
                    : [{ value: "staff", label: "Staff" }],
              },
              password: {
                help: "At least 12 characters. Share credentials securely; no invitation email is sent.",
              },
            }}
            onSave={async (body) => {
              await auth.request("POST /users", { body });
              await refresh();
            }}
            onSaved={() => setAdding(false)}
            submitLabel="Create account"
          />
          <button className="button secondary" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </section>
      )}
    </>
  );
}
