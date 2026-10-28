import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../app/auth";
import { useRefreshClinic } from "../clinic/ClinicPages";
import { ContractForm } from "../../components/ui/contract-form";
import { PageHeader } from "../../components/ui/patterns";
import { PatientSearch } from "./PatientSearch";
export function PatientsPage() {
  const navigate = useNavigate(),
    auth = useAuth(),
    refresh = useRefreshClinic();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader
        title="Patients"
        description="Find patient records and appointment history."
        actions={
          <button className="button" onClick={() => setAdding(true)}>
            Add patient
          </button>
        }
      />
      <section className="panel">
        <PatientSearch onSelect={(p) => void navigate(`/patients/${p.id}`)} />
      </section>
      {adding && (
        <section className="panel editor">
          <h2>Add patient</h2>
          <ContractForm
            schema="PatientCreate"
            fields={{
              name_ur: { label: "Name · Urdu" },
              dob: { label: "Date of birth" },
            }}
            onSave={async (body) => {
              const patient = await auth.request("POST /patients", { body });
              await refresh();
              void navigate(`/patients/${patient.id}`);
            }}
          />
          <button className="button secondary" onClick={() => setAdding(false)}>
            Close editor
          </button>
        </section>
      )}
    </>
  );
}
