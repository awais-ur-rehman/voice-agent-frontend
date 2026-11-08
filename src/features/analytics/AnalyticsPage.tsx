import { useState } from "react";
import { useLocation } from "react-router";
import { PageHeader } from "../../components/ui/patterns";
import { useAuth } from "../../app/auth";
import { useDashboardQuery } from "../clinic/ClinicPages";
import { AnalyticsFilters, useAnalyticsFilters } from "./AnalyticsFilters";
import { AnalyticsScope } from "./shared";
import { AnalyticsSettings } from "./AnalyticsSettings";
import { Bars, Freshness, ReadState, Usage, SeekPage } from "./charts";
import {
  hourLabel,
  label,
  ms,
  rangeError,
  ratio,
  utc,
  alertEvidence,
} from "./presentation";
export function AnalyticsPage() {
  const auth = useAuth();
  return <AnalyticsWorkspace key={auth.sessionId} />;
}
function AnalyticsWorkspace() {
  const auth = useAuth();
  const location = useLocation();
  const filters = useAnalyticsFilters();
  const [settings, setSettings] = useState(false);
  const invalid = rangeError(filters.start, filters.end);
  return (
    <div className="analytics-workspace">
      <PageHeader
        title="Analytics"
        description="Session activity, outcomes and service quality."
        actions={
          auth.isManager ? (
            <button
              id="capture-settings-trigger"
              className="button secondary"
              onClick={() => setSettings(true)}
            >
              Capture settings
            </button>
          ) : null
        }
      />
      <AnalyticsScope />
      <AnalyticsFilters key={`filters:${location.search}`} />
      <details className="analytics-help">
        <summary>How these numbers are counted</summary>
        <p>
          Production sessions only; isolated tests are excluded. Dates select
          the session’s saved local admission date, in its original timezone.
          Choose up to 31 inclusive dates within the last 365 days. Active
          sessions are excluded from outcome rates; operations are counted
          separately from converted sessions.
        </p>
        <p>
          Exact latency uses raw samples retained for 90 days, with a
          100,000-sample limit. Voice-stage eligibility includes only voice
          sessions. Diagnostics do not replace missing first-token, first-byte
          or audio measurements. Abandonment includes unfinished explicit ends
          and timeouts.
        </p>
      </details>
      {invalid ? (
        <p role="alert">{invalid}</p>
      ) : (
        <AnalyticsResults key={`results:${location.search}`} />
      )}
      {settings && auth.isManager ? (
        <AnalyticsSettings onClose={() => setSettings(false)} />
      ) : null}
    </div>
  );
}
function AnalyticsResults() {
  const filters = useAnalyticsFilters();
  const query = { query: filters };
  const overview = useDashboardQuery(
    "GET /dashboard/analytics/overview",
    query,
  );
  const quality = useDashboardQuery("GET /dashboard/analytics/quality", query);
  const latency = useDashboardQuery("GET /dashboard/analytics/latency", query);
  const intents = useDashboardQuery("GET /dashboard/analytics/intents", query);
  const [gapAfter, setGapAfter] = useState<string | undefined>();
  const [alertAfter, setAlertAfter] = useState<string | undefined>();
  const gaps = useDashboardQuery("GET /dashboard/analytics/knowledge-gaps", {
    query: { ...filters, limit: 25, after: gapAfter },
  });
  const alerts = useDashboardQuery("GET /dashboard/analytics/alerts", {
    query: { ...filters, limit: 25, after: alertAfter },
  });
  const o = overview.data;
  return (
    <div className="analytics-panels">
      <ReadState query={overview}>
        {o ? (
          <>
            <div className="analytics-overview-band">
              <Freshness value={o.freshness} />
              <dl className="analytics-metrics">
                <div>
                  <dt>Admitted sessions</dt>
                  <dd>{o.sessions}</dd>
                  <small>
                    {o.voice_sessions} voice · {o.text_sessions} text
                  </small>
                </div>
                <div>
                  <dt>Booking conversion</dt>
                  <dd>{ratio(o.booking_conversion)}</dd>
                  <small>Ended sessions with a booking / ended</small>
                </div>
                <div>
                  <dt>Handoff rate</dt>
                  <dd>{ratio(o.handoff_rate)}</dd>
                  <small>Ended with committed handoff / ended</small>
                </div>
                <div>
                  <dt>Abandonment</dt>
                  <dd>{ratio(o.abandonment_rate)}</dd>
                  <small>
                    Ended abandoned / ended, including incomplete caller ends
                  </small>
                </div>
              </dl>
              <p className="analytics-context">
                {o.ended_sessions} ended · {o.book_operations} bookings ·{" "}
                {o.cancel_operations} cancellations · {o.reschedule_operations}{" "}
                reschedules. Operations are separate from converted sessions.
                Average ended duration {ms(o.average_duration_ms)} ·{" "}
                {o.duration_samples} samples.
              </p>
            </div>
            <section className="panel">
              <h2>Provider usage</h2>
              <Usage value={o.usage} />
            </section>
            <section className="panel">
              <Bars
                title="Daily admissions"
                rows={o.days.map((d) => ({
                  key: d.local_date,
                  label: d.local_date,
                  value: d.sessions,
                }))}
              >
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable data table"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Admission date</th>
                        <th>Sessions</th>
                        <th>Ended</th>
                        <th>With booking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.days.map((d) => (
                        <tr key={d.local_date}>
                          <td>{d.local_date}</td>
                          <td>{d.sessions}</td>
                          <td>{d.ended_sessions}</td>
                          <td>{d.booking_sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Bars>
            </section>
            <section className="panel">
              <h2>Peak hours</h2>
              <p>
                The 12 busiest groups. All hours, timezones and UTC identities
                are in the data table.
              </p>
              {o.hours.unavailable_reason ? (
                <p role="status">
                  Hourly series unavailable: more than the{" "}
                  {o.hours.limit ?? 2000} group limit. Daily totals remain
                  complete; narrow the filters.
                </p>
              ) : (
                <Bars
                  title="Busiest hourly groups · zero-based scale"
                  rows={[...o.hours.items]
                    .sort((a, b) => b.sessions - a.sessions)
                    .slice(0, 12)
                    .map((h) => ({
                      key: `${h.bucket_start}-${h.timezone}-${h.channel}-${h.utc_offset_minutes}`,
                      label: `${hourLabel(h)} · ${label(h.channel)}`,
                      value: h.sessions,
                    }))}
                >
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Scrollable data table"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Local hour / offset</th>
                          <th>UTC identity</th>
                          <th>Channel</th>
                          <th>Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.hours.items.map((h) => (
                          <tr
                            key={`${h.bucket_start}-${h.timezone}-${h.channel}-${h.utc_offset_minutes}`}
                          >
                            <td>{hourLabel(h)}</td>
                            <td>{utc(h.bucket_start)}</td>
                            <td>{label(h.channel)}</td>
                            <td>{h.sessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Bars>
              )}
            </section>
          </>
        ) : null}
      </ReadState>
      <section className="panel">
        <h2>Task and conversation quality</h2>
        <ReadState query={quality}>
          {quality.data ? (
            <>
              <Freshness value={quality.data.freshness} />
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Scrollable data table"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value · numerator / denominator</th>
                      <th>Definition</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Task completion</td>
                      <td>{ratio(quality.data.task_completion)}</td>
                      <td>Completed / attempted scheduling tasks</td>
                    </tr>
                    <tr>
                      <td>Tool failure</td>
                      <td>{ratio(quality.data.tool_failure)}</td>
                      <td>Failed / all actual tool results</td>
                    </tr>
                    <tr>
                      <td>Repeated question</td>
                      <td>{ratio(quality.data.repeated_question)}</td>
                      <td>
                        Same prompt without progress / eligible completed
                        prompts
                      </td>
                    </tr>
                    <tr>
                      <td>Caller turns per task</td>
                      <td>{ratio(quality.data.turns_per_task, false)}</td>
                      <td>Task-assigned caller turns / attempted tasks</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </ReadState>
      </section>
      <section className="panel">
        <h2>Measured stages</h2>
        <p>p50 / p95 response times and sample coverage.</p>
        <ReadState query={latency}>
          {latency.data ? (
            <>
              <Freshness value={latency.data.freshness} />
              {latency.data.unavailable_reason ? (
                <p role="status">
                  Timing data unavailable:{" "}
                  {label(latency.data.unavailable_reason)}.
                </p>
              ) : (
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable data table"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Stage</th>
                        <th>p50</th>
                        <th>p95</th>
                        <th>Samples</th>
                        <th>Sampled / eligible sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latency.data.stages.map((s) => (
                        <tr key={s.stage}>
                          <td>
                            {label(s.stage)}
                            {s.diagnostic ? " · diagnostic" : ""}
                          </td>
                          <td>{ms(s.p50_ms)}</td>
                          <td>{ms(s.p95_ms)}</td>
                          <td>{s.samples ?? "Unknown"}</td>
                          <td>
                            {s.sampled_sessions ?? "Unknown"} /{" "}
                            {s.eligible_sessions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </ReadState>
      </section>
      <section className="panel">
        <h2>Session intents</h2>
        <p>Intents overlap; shares can exceed 100% in total.</p>
        <ReadState query={intents}>
          {intents.data ? (
            <>
              <Freshness value={intents.data.freshness} />
              {intents.data.unavailable_reason ? (
                <p>
                  Intents unavailable: {label(intents.data.unavailable_reason)}.
                </p>
              ) : (
                <Bars
                  title="Accepted intents"
                  rows={intents.data.items.map((r) => ({
                    key: r.intent,
                    label: label(r.intent),
                    value: r.sessions,
                  }))}
                >
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Scrollable data table"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Intent</th>
                          <th>Sessions</th>
                          <th>Share · sessions / all admissions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intents.data.items.map((r) => (
                          <tr key={r.intent}>
                            <td>{label(r.intent)}</td>
                            <td>{r.sessions}</td>
                            <td>{ratio(r.share)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Bars>
              )}
            </>
          ) : null}
        </ReadState>
      </section>
      <section className="panel">
        <h2>Knowledge gaps</h2>
        <ReadState query={gaps}>
          {gaps.data ? (
            <>
              <Freshness value={gaps.data.freshness} />
              <p>
                {gaps.data.irrelevant} irrelevant · {gaps.data.unavailable}{" "}
                unavailable.
              </p>
              <p>
                {gaps.data.unattributed_observations} legacy / preview
                observations · channel unknown · observed UTC dates.
              </p>
              {gaps.data.unavailable_reason ? (
                <p>Gaps unavailable: {label(gaps.data.unavailable_reason)}.</p>
              ) : (
                <>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Scrollable data table"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Keyed fingerprint</th>
                          <th>Decision</th>
                          <th>Occurrences</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gaps.data.items.map((r) => (
                          <tr key={`${r.fingerprint}-${r.decision}`}>
                            <td className="opaque-id">{r.fingerprint}</td>
                            <td>{label(r.decision)}</td>
                            <td>{r.occurrences}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!gaps.data.items.length ? (
                    <p>No attributed knowledge gaps.</p>
                  ) : null}
                  <SeekPage
                    total={gaps.data.total}
                    count={gaps.data.items.length}
                    more={gaps.data.has_more}
                    reset={() => setGapAfter(undefined)}
                    next={() =>
                      setGapAfter(gaps.data!.next_cursor ?? undefined)
                    }
                    first={!gapAfter}
                  />
                </>
              )}
            </>
          ) : null}
        </ReadState>
      </section>
      <section className="panel">
        <h2>Alert history</h2>
        <p>15-minute checks · filtered by last seen (UTC).</p>
        <ReadState query={alerts}>
          {alerts.data ? (
            <>
              <Freshness value={alerts.data.freshness} />
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Scrollable data table"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Alert</th>
                      <th>State</th>
                      <th>Channel</th>
                      <th>Evidence</th>
                      <th>Last seen (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.data.items.map((a) => (
                      <tr key={a.id}>
                        <td>{label(a.kind)}</td>
                        <td>{label(a.state)}</td>
                        <td>
                          {a.channel
                            ? label(a.channel)
                            : "Unattributed queue work"}
                        </td>
                        <td>{alertEvidence(a)}</td>
                        <td>{utc(a.last_seen_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!alerts.data.items.length ? (
                <p>No alerts in this window.</p>
              ) : null}
              <SeekPage
                total={alerts.data.total}
                count={alerts.data.items.length}
                more={alerts.data.has_more}
                reset={() => setAlertAfter(undefined)}
                next={() =>
                  setAlertAfter(alerts.data!.next_cursor ?? undefined)
                }
                first={!alertAfter}
              />
            </>
          ) : null}
        </ReadState>
      </section>
    </div>
  );
}
