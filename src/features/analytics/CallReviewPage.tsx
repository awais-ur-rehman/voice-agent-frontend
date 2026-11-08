import { useEffect, useRef } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { useAuth } from "../../app/auth";
import { PageHeader, StatusBadge } from "../../components/ui/patterns";
import { useDashboardQuery } from "../clinic/ClinicPages";
import {
  AnalyticsFilterScope,
  AnalyticsFilters,
  useAnalyticsFilters,
} from "./AnalyticsFilters";
import { ReadState, SeekPage } from "./charts";
import { AnalyticsScope } from "./shared";
import { label, rangeError, utc, sessionDuration } from "./presentation";
export function CallReviewPage() {
  const auth = useAuth();
  return (
    <AnalyticsFilterScope key={auth.sessionId}>
      <CallReviewWorkspace />
    </AnalyticsFilterScope>
  );
}
function CallReviewWorkspace() {
  const filters = useAnalyticsFilters();
  const location = useLocation();
  const invalid = rangeError(filters.start, filters.end);
  return (
    <div className="analytics-workspace">
      <PageHeader
        title="Calls & sessions"
        description="Review session outcomes and flagged conversations."
      />
      <AnalyticsScope />
      <AnalyticsFilters calls key={location.search} />
      {invalid ? <p role="alert">{invalid}</p> : <CallRows />}
    </div>
  );
}
function CallRows() {
  const filters = useAnalyticsFilters();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const after = params.get("after") ?? undefined;
  const query = useDashboardQuery("GET /dashboard/calls", {
    query: {
      ...filters,
      outcome: params.get("outcome") ?? undefined,
      review_flag: params.get("review_flag") ?? undefined,
      after,
      limit: 25,
    },
  });
  const agents = useDashboardQuery("GET /dashboard/agents");
  const page = query.data;
  const restoredLocation = useRef<string | null>(null);
  useEffect(() => {
    const focus = location.state?.focus;
    if (
      page &&
      typeof focus === "string" &&
      restoredLocation.current !== location.key
    ) {
      document.getElementById(`review-${focus}`)?.focus();
      restoredLocation.current = location.key;
    }
  }, [page, location.state, location.key]);
  function seek(value: string | undefined) {
    const next = new URLSearchParams(params);
    if (value) next.set("after", value);
    else next.delete("after");
    setParams(next);
  }
  return (
    <section className="panel">
      <ReadState query={query}>
        {page ? (
          <>
            <p>
              Sessions from the last 90 days · updated {utc(page.snapshot_at)}
            </p>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Scrollable data table"
            >
              <table className="analytics-call-table">
                <thead>
                  <tr>
                    <th>Session start (UTC)</th>
                    <th className="call-agent">Agent / channel</th>
                    <th>Outcome</th>
                    <th className="call-flags">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((call) => (
                    <tr key={call.session_id}>
                      <td>
                        {utc(call.started_at)}
                        <small>Duration: {sessionDuration(call)}</small>
                        <small>
                          {call.timezone} · {label(call.language)}
                        </small>
                        <small className="call-mobile" dir="auto">
                          {agents.data?.find((a) => a.id === call.agent_id)
                            ?.name ??
                            `Historical agent · ${call.agent_id}`}{" "}
                          · {label(call.channel)}
                        </small>
                        <div className="call-row-action">
                          <Link
                            className="button secondary"
                            id={`review-${call.session_id}`}
                            aria-label={`Review session ${call.session_id}`}
                            to={`/calls/${encodeURIComponent(call.session_id)}`}
                            state={{
                              back: `/calls${location.search}`,
                              focus: call.session_id,
                            }}
                          >
                            Review session
                          </Link>
                        </div>
                      </td>
                      <td className="call-agent" dir="auto">
                        {agents.data?.find((a) => a.id === call.agent_id)
                          ?.name ?? `Historical agent · ${call.agent_id}`}
                        <small>{label(call.channel)}</small>
                      </td>
                      <td>
                        <StatusBadge>
                          {call.outcome
                            ? label(call.outcome)
                            : label(call.status)}
                        </StatusBadge>
                        <small>
                          End:{" "}
                          {call.end_reason
                            ? label(call.end_reason)
                            : "Not ended"}
                          {call.pending_expiry ? " · expiry pending" : ""}
                        </small>
                        <small className="call-mobile">
                          {call.quality_flags.map(label).join(", ") ||
                            "No observed flags"}
                        </small>
                      </td>
                      <td className="call-flags">
                        {call.quality_flags.map(label).join(", ") ||
                          "No observed flags"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!page.items.length ? (
              <p className="empty-state">No sessions match these filters.</p>
            ) : null}
            <SeekPage
              total={page.total}
              count={page.items.length}
              more={page.has_more}
              first={!after}
              reset={() => seek(undefined)}
              next={() => seek(page.next_cursor ?? undefined)}
            />
          </>
        ) : null}
      </ReadState>
    </section>
  );
}
