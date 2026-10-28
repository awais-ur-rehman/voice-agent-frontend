import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../app/auth";
import {
  useDashboardQuery,
  QueryState,
  useRefreshClinic,
} from "../clinic/ClinicPages";
import {
  PageHeader,
  ErrorSummary,
  StatusBadge,
  EmptyState,
} from "../../components/ui/patterns";
export function AgentsPage() {
  const auth = useAuth(),
    query = useDashboardQuery("GET /dashboard/agents"),
    refresh = useRefreshClinic(),
    navigate = useNavigate();
  const [name, setName] = useState(""),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <>
      <PageHeader
        title="Agents"
        description="Configure a saved draft, publish a version, and test in an isolated clinic."
        actions={
          auth.isManager && (
            <button className="button" onClick={() => setCreating(!creating)}>
              Create agent
            </button>
          )
        }
      />
      {creating && (
        <section className="panel">
          <h2>New agent draft</h2>
          <form
            className="form-field"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) {
                setError("Enter a nonblank agent name.");
                return;
              }
              setBusy(true);
              setError(undefined);
              try {
                const result = await auth.request("POST /dashboard/agents", {
                  body: { name: name.trim() },
                });
                await refresh();
                void navigate(`/agents/${result.id}`);
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="new-agent-name">New agent name</label>
            <input
              id="new-agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={busy}
              required
            />
            <div className="form-actions">
              <button className="button" disabled={busy}>
                Create draft
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
            </div>
            <ErrorSummary error={error} />
          </form>
        </section>
      )}
      <section className="panel">
        <QueryState query={query}>
          {query.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Language</th>
                    <th>Admission</th>
                    <th>Published</th>
                    <th>Draft</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((agent) => (
                    <tr key={agent.id}>
                      <td>
                        {auth.isManager ? (
                          <Link to={`/agents/${agent.id}`} dir="auto">
                            {agent.name}
                          </Link>
                        ) : (
                          <span dir="auto">{agent.name}</span>
                        )}
                      </td>
                      <td>{agent.language_mode}</td>
                      <td>
                        <StatusBadge>
                          {agent.archived_at
                            ? "Archived"
                            : agent.enabled
                              ? "Enabled"
                              : "Disabled"}
                        </StatusBadge>
                      </td>
                      <td>
                        {agent.published_number
                          ? `Version ${agent.published_number}`
                          : "Not published"}
                      </td>
                      <td>
                        {agent.draft_changed
                          ? "Changes saved"
                          : "Matches published version"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No agents yet. Create a draft to begin.</EmptyState>
          )}
        </QueryState>
        {!auth.isManager && (
          <p className="muted">
            Owners and admins manage agent drafts and isolated tests.
          </p>
        )}
      </section>
    </>
  );
}
