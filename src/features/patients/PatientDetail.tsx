import { useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../app/auth";
import { ContractForm } from "../../components/ui/contract-form";
import { PageHeader, StatusBadge } from "../../components/ui/patterns";
import {
  useCatalog,
  useDashboardQuery,
  useRefreshClinic,
  QueryState,
} from "../clinic/ClinicPages";
import { slotLabel } from "../scheduling/dates";
import { MergeDialog } from "./MergeDialog";
import { Pagination } from "./PatientSearch";
export function PatientDetail() {
  const { identity = "" } = useParams();
  return <PatientRecord key={identity} identity={identity} />;
}
function PatientRecord({ identity }: { identity: string }) {
  const auth = useAuth(),
    refresh = useRefreshClinic(),
    catalog = useCatalog();
  const [offset, setOffset] = useState(0),
    [edit, setEdit] = useState(false),
    [merge, setMerge] = useState(false);
  const patient = useDashboardQuery("GET /dashboard/patients/{identity}", {
      params: { identity },
    }),
    clinic = useDashboardQuery("GET /dashboard/clinic");
  const history = useDashboardQuery("GET /patients/{patient_id}/appointments", {
    params: { patient_id: identity },
    query: { limit: 25, offset },
  });
  return (
    <>
      <PageHeader
        title="Patient record"
        description="Patient details and server appointment history."
      />
      <QueryState query={patient}>
        {patient.data && (
          <>
            <section className="panel">
              <h2 dir="auto">{patient.data.name}</h2>
              <p className="urdu" dir="auto" lang="ur">
                {patient.data.name_ur}
              </p>
              <p dir="ltr">{patient.data.phone}</p>
              <p>Date of birth: {patient.data.dob ?? "Not recorded"}</p>
              {patient.data.merged_into_id ? (
                <p className="notice">
                  This retained record was merged and is read-only.{" "}
                  <Link to={`/patients/${patient.data.merged_into_id}`}>
                    Open retained patient
                  </Link>
                </p>
              ) : (
                <div className="form-actions">
                  <button
                    className="button secondary"
                    onClick={() => setEdit(!edit)}
                  >
                    Edit patient
                  </button>
                  {auth.isManager && (
                    <button
                      className="button secondary"
                      onClick={() => setMerge(true)}
                    >
                      Merge patient
                    </button>
                  )}
                </div>
              )}
            </section>
            {edit && !patient.data.merged_into_id && (
              <section className="panel editor">
                <h2>Edit patient</h2>
                <ContractForm
                  schema="PatientCreate"
                  initial={patient.data}
                  fields={{
                    name_ur: { label: "Name · Urdu" },
                    dob: { label: "Date of birth" },
                  }}
                  onSave={async (body) => {
                    await auth.request("PUT /patients/{identity}", {
                      params: { identity },
                      body,
                    });
                    await refresh();
                  }}
                  onSaved={() => setEdit(false)}
                />
              </section>
            )}
            {merge && auth.isManager && !patient.data.merged_into_id && (
              <MergeDialog
                source={patient.data}
                onClose={() => setMerge(false)}
              />
            )}
          </>
        )}
      </QueryState>
      <section className="panel">
        <h2>Appointment history</h2>
        <QueryState query={history}>
          <div className="appointment-list">
            {history.data?.map((a) => (
              <div className="appointment-row" key={a.id}>
                <span dir="ltr">
                  {clinic.data
                    ? slotLabel(a.starts_at, clinic.data.timezone)
                    : a.starts_at}
                </span>
                <span dir="auto">
                  {catalog.providers.data?.find((p) => p.id === a.provider_id)
                    ?.name ?? a.provider_id}{" "}
                  ·{" "}
                  {catalog.services.data?.find((s) => s.id === a.service_id)
                    ?.name ?? a.service_id}
                </span>
                <StatusBadge>{a.status}</StatusBadge>
              </div>
            ))}
          </div>
          {history.data?.length === 0 && (
            <p>No appointments on this retained record.</p>
          )}
          <Pagination
            offset={offset}
            hasNext={history.data?.length === 25}
            onChange={setOffset}
          />
        </QueryState>
      </section>
      <Link to="/patients">Back to patients</Link>
    </>
  );
}
