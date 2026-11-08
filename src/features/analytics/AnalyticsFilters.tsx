import { useState } from "react";
import { useSearchParams } from "react-router";
import { useDashboardQuery } from "../clinic/ClinicPages";
import { rangeError, label } from "./presentation";
export function useAnalyticsFilters() {
  const [params] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const start =
    params.get("start") ??
    new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10);
  const end = params.get("end") ?? today;
  const channel = params.get("channel") ?? "all";
  const agent_id = params.get("agent_id") ?? undefined;
  const timezone = params.get("timezone") ?? undefined;
  return { start, end, channel, agent_id, timezone };
}
export function AnalyticsFilters({ calls = false }: { calls?: boolean }) {
  const filters = useAnalyticsFilters();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState("");
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
          defaultValue={filters.agent_id ?? ""}
        >
          <option value="">All agents</option>
          {agents.data
            ?.filter((a) => !a.archived_at)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          {filters.agent_id &&
          !agents.data?.some((a) => a.id === filters.agent_id) ? (
            <option value={filters.agent_id}>
              Historical agent · {filters.agent_id}
            </option>
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
