import { useEffect, useState } from "react";
import { useDashboardQuery, QueryState } from "../clinic/ClinicPages";
import type { PatientDetail } from "../../api/dashboard.generated";
export function usePatientSearch(text: string, offset = 0) {
  const [q, setQ] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setQ(text), 300);
    return () => clearTimeout(timer);
  }, [text]);
  return useDashboardQuery("GET /dashboard/patients", {
    query: { q, limit: 25, offset: text === q ? offset : 0 },
  });
}
export function PatientSearch({
  onSelect,
  exclude,
}: {
  onSelect: (patient: PatientDetail) => void;
  exclude?: string;
}) {
  const [text, setText] = useState(""),
    [offset, setOffset] = useState(0);
  const query = usePatientSearch(text, offset);
  return (
    <section aria-label="Patient selection">
      <label htmlFor="patient-search">Search patients by name or phone</label>
      <input
        id="patient-search"
        dir="auto"
        maxLength={120}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOffset(0);
        }}
        autoComplete="off"
      />
      <p className="muted">
        Shared phone numbers do not establish patient identity. Select the
        correct record.
      </p>
      <QueryState query={query}>
        <ul className="patient-results">
          {query.data?.items
            .filter((p) => p.id !== exclude)
            .map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onSelect(p)}
                >
                  <span dir="auto">
                    {p.name} {p.name_ur}
                  </span>
                  <span dir="ltr">{p.phone}</span>
                </button>
              </li>
            ))}
        </ul>
        {query.data?.total === 0 && <p>No patients found.</p>}
        <Pagination
          offset={offset}
          total={query.data?.total ?? 0}
          onChange={setOffset}
        />
      </QueryState>
    </section>
  );
}
export function Pagination({
  offset,
  total,
  onChange,
  hasNext,
}: {
  offset: number;
  total?: number;
  hasNext?: boolean;
  onChange: (offset: number) => void;
}) {
  return (
    <div className="pagination">
      <button
        type="button"
        className="button secondary"
        disabled={!offset}
        onClick={() => onChange(Math.max(0, offset - 25))}
      >
        Previous page
      </button>
      <span>
        Page {offset / 25 + 1}
        {total !== undefined ? ` · ${total} records` : ""}
      </span>
      <button
        type="button"
        className="button secondary"
        disabled={total !== undefined ? offset + 25 >= total : !hasNext}
        onClick={() => onChange(offset + 25)}
      >
        Next page
      </button>
    </div>
  );
}
