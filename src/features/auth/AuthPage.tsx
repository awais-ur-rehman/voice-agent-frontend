import { Link, Navigate } from "react-router";
import { useAuth } from "../../app/auth";
import { ContractForm } from "../../components/ui/contract-form";
export function AuthPage({ signup = false }: { signup?: boolean }) {
  const auth = useAuth();
  if (auth.me) return <Navigate to="/" replace />;
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <span className="brand-mark">C</span>Clinic workspace
      </div>
      <section className="auth-panel">
        <p className="eyebrow">{signup ? "NEW WORKSPACE" : "WELCOME BACK"}</p>
        <h1>{signup ? "Create your clinic" : "Sign in"}</h1>
        <p>
          {signup
            ? "Set up a workspace for your clinic and team."
            : "Manage your clinic’s daily operations."}
        </p>
        {signup ? (
          <ContractForm
            schema="Register"
            initial={{
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }}
            onSave={auth.register}
            submitLabel="Create clinic"
            fields={{
              display_name: { label: "Your name" },
              clinic_name: { label: "Clinic name" },
              timezone: {
                label: "Clinic timezone",
                help: "IANA timezone, for example Asia/Karachi.",
              },
              password: { help: "At least 12 characters." },
            }}
          />
        ) : (
          <ContractForm
            schema="Login"
            onSave={auth.login}
            submitLabel="Sign in"
          />
        )}
        <p className="auth-switch">
          {signup ? "Already have a workspace?" : "Starting a clinic?"}{" "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create a clinic"}
          </Link>
        </p>
      </section>
      <p className="auth-note">
        Refreshing the page requires signing in again.
      </p>
    </main>
  );
}
