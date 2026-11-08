import type { ReactNode } from "react";
import type { FreshnessView, UsageView } from "../../api/dashboard.generated";
import { QueryState } from "../clinic/ClinicPages";
import { money, utc } from "./presentation";
export function ReadState({
  query,
  children,
}: {
  query: {
    isPending: boolean;
    error: unknown;
    data?: unknown;
    refetch: () => unknown;
  };
  children: ReactNode;
}) {
  return (
    <>
      <QueryState query={query}>{children}</QueryState>
      {query.error ? (
        <button
          className="button secondary"
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      ) : null}
    </>
  );
}
export function Freshness({ value }: { value: FreshnessView }) {
  return (
    <p
      className={`analytics-freshness ${value.stale ? "is-stale" : ""}`}
      role="status"
    >
      {value.stale ? "Stale · " : "Updated · "}As of {utc(value.as_of)} ·{" "}
      {value.pending_buckets} pending updates · {value.pending_expirations}{" "}
      pending expirations
    </p>
  );
}
export function Usage({ value }: { value: UsageView }) {
  return (
    <div className="analytics-usage">
      <strong>{money(value.estimated_usd)}</strong>
      <span>
        Covered estimate · {value.cost_known} / {value.invocations} priced
        invocations
        {value.cost_known < value.invocations
          ? " · Partial cost coverage; unknown usage is not free."
          : ""}
      </span>
      <span>
        Reported input / output tokens: {value.input_tokens ?? "Unknown"} /{" "}
        {value.output_tokens ?? "Unknown"} · {value.usage_known} /{" "}
        {value.invocations} paired usage
      </span>
      <small>
        Clinic estimate from reported tokens and configured USD rates; not a
        total bill.
      </small>
    </div>
  );
}
export function Bars({
  title,
  rows,
  children,
}: {
  title: string;
  rows: { key: string; label: string; value: number }[];
  children: ReactNode;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="analytics-figure">
      <figcaption>{title}</figcaption>
      {rows.length ? (
        <div className="analytics-bars" aria-hidden="true">
          {rows.slice(0, 31).map((row) => (
            <div className="analytics-bar-row" key={row.key}>
              <span>{row.label}</span>
              <span className="analytics-bar-track">
                <i style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
              <b>{row.value}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No observations in this cohort.</p>
      )}
      {rows.length > 31 ? (
        <p>First 31 groups drawn; the table includes every returned group.</p>
      ) : null}
      <details>
        <summary>View data table</summary>
        {children}
      </details>
    </figure>
  );
}

export function SeekPage({
  total,
  count,
  more,
  reset,
  next,
  first,
}: {
  total: number;
  count: number;
  more: boolean;
  reset: () => void;
  next: () => void;
  first: boolean;
}) {
  return (
    <div className="pagination">
      <button className="button secondary" disabled={first} onClick={reset}>
        First page
      </button>
      <span>
        {count} on this page · {total} matching
      </span>
      <button className="button secondary" disabled={!more} onClick={next}>
        Next page
      </button>
    </div>
  );
}
