import { createContext, useContext, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { useDashboardQuery } from "../clinic/ClinicPages";
import { rangeError, label } from "./presentation";
import { ReadState } from "./charts";
import { AnalyticsScope } from "./shared";
function initialFilters(params: URLSearchParams, clinicTimezone: string) {
  const timezone = params.get("timezone") ?? undefined;
  let today: string;
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone || clinicTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    today = `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    // Invalid URL timezone remains in the request for normal API validation.
    today = new Date().toISOString().slice(0, 10);
  }
  return {
    start:
      params.get("start") ??
      new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10),
    end: params.get("end") ?? today,
    channel: params.get("channel") ?? "all",
    agent_id: params.get("agent_id") ?? undefined,
    timezone,
  };
}
const FilterContext = createContext<ReturnType<typeof initialFilters> | null>(
  null,
);
export function useAnalyticsFilters() {
  const filters = useContext(FilterContext);
  if (!filters) throw new Error("Analytics filters require their scope");
  return filters;
}
export function AnalyticsFilterScope({ children }: { children: ReactNode }) {
  const [params] = useSearchParams();
  const clinic = useDashboardQuery("GET /dashboard/clinic");
  const needsClinic =
    (!params.has("start") || !params.has("end")) && !params.get("timezone");
  if (needsClinic && !clinic.data)
    return (
      <div className="analytics-workspace">
        <AnalyticsScope />
        <ReadState query={clinic}>{null}</ReadState>
      </div>
    );
  return (
    <ResolvedFilters
      key={params.toString()}
      clinicTimezone={clinic.data?.timezone ?? "UTC"}
    >
      {children}
    </ResolvedFilters>
  );
}
function ResolvedFilters({
  clinicTimezone,
  children,
}: {
  clinicTimezone: string;
  children: ReactNode;
}) {
  const [params] = useSearchParams();
  // One admission cohort per URL: profile/name refreshes cannot change a visible
  // default, the requested dates, or an unsaved form. Navigation remounts it.
  const [filters] = useState(() => initialFilters(params, clinicTimezone));
  return <FilterContext value={filters}>{children}</FilterContext>;
}
export function AnalyticsFilters({ calls = false }: { calls?: boolean }) {
  const filters = useAnalyticsFilters();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState("");
  const [agentId, setAgentId] = useState(filters.agent_id ?? "");
  const agents = useDashboardQuery("GET /dashboard/agents");
  return (
    <form
      className="analytics-filters"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const start = String(form.get("start")),
          end = String(form.get("end"));
        const problem = rangeError(start, end);
        setError(problem);
        if (problem) return;
        const next = new URLSearchParams();
        for (const [key, value] of form)
          if (typeof value === "string" && value) next.set(key, value);
        setParams(next);
      }}
    >
      <div className="form-field">
        <label htmlFor="analytics-start">From</label>
        <input
          id="analytics-start"
          name="start"
          type="date"
          required
          defaultValue={filters.start}
        />
      </div>
      <div className="form-field">
        <label htmlFor="analytics-end">Through</label>
        <input
          id="analytics-end"
          name="end"
          type="date"
          required
          defaultValue={filters.end}
        />
      </div>
      <div className="form-field">
        <label htmlFor="analytics-channel">Channel</label>
        <select
          id="analytics-channel"
          name="channel"
          defaultValue={filters.channel}
        >
          <option value="all">All channels</option>
          <option value="voice">Voice</option>
          <option value="text">Text</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="analytics-agent">Agent</label>
        <select
          id="analytics-agent"
          name="agent_id"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
        >
          <option value="">All agents</option>
          {agents.data
            ?.filter((a) => !a.archived_at)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          {agentId &&
          !agents.data?.some((a) => a.id === agentId && !a.archived_at) ? (
            <option value={agentId}>Historical agent · {agentId}</option>
          ) : null}
        </select>
        {agents.error ? <small>Agent names unavailable.</small> : null}
      </div>
      <div className="form-field">
        <label htmlFor="analytics-timezone">Admission timezone</label>
        <input
          id="analytics-timezone"
          name="timezone"
          placeholder="All stored timezones"
          defaultValue={filters.timezone ?? ""}
        />
      </div>
      {calls ? (
        <>
          <div className="form-field">
            <label htmlFor="analytics-outcome">Outcome</label>
            <select
              id="analytics-outcome"
              name="outcome"
              defaultValue={params.get("outcome") ?? ""}
            >
              <option value="">All outcomes</option>
              {[
                "booked",
                "cancelled",
                "rescheduled",
                "info_only",
                "abandoned",
                "handoff",
                "error",
              ].map((v) => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="analytics-flag">Review flag</label>
            <select
              id="analytics-flag"
              name="review_flag"
              defaultValue={params.get("review_flag") ?? ""}
            >
              <option value="">All flags</option>
              {[
                "repeated_prompt",
                "interruptions",
                "low_stt_confidence",
                "handoff",
              ].map((v) => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
      <button className="button" type="submit">
        Apply filters
      </button>
      {error ? (
        <p role="alert" className="filter-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
