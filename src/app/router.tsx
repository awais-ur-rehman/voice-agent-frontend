import { createBrowserRouter, Navigate } from "react-router";
import { AuthPage } from "../features/auth/AuthPage";
import { AppShell } from "./AppShell";
import {
  ClinicPage,
  SetupPage,
  ProvidersPage,
  ServicesPage,
  StaffPage,
} from "../features/clinic/ClinicPages";
import { Suspense, lazy } from "react";
import { useDashboardQuery, QueryState } from "../features/clinic/ClinicPages";
const SchedulePage = lazy(() =>
  import("../features/scheduling/SchedulePage").then((m) => ({
    default: m.SchedulePage,
  })),
);
const PatientsPage = lazy(() =>
  import("../features/patients/PatientsPage").then((m) => ({
    default: m.PatientsPage,
  })),
);
const PatientDetail = lazy(() =>
  import("../features/patients/PatientDetail").then((m) => ({
    default: m.PatientDetail,
  })),
);
const AgentsPage = lazy(() =>
  import("../features/agents/AgentsPage").then((m) => ({
    default: m.AgentsPage,
  })),
);
const AgentEditor = lazy(() =>
  import("../features/agents/AgentEditor").then((m) => ({
    default: m.AgentEditor,
  })),
);
function Landing() {
  const query = useDashboardQuery("GET /dashboard/setup");
  return (
    <QueryState query={query}>
      {query.data && (
        <Navigate
          to={
            query.data.profile &&
            query.data.providers &&
            query.data.services &&
            query.data.hours
              ? "/schedule"
              : "/setup"
          }
          replace
        />
      )}
    </QueryState>
  );
}
import { HoursPage } from "../features/clinic/HoursPage";
export const routes = [
  { path: "/login", element: <AuthPage /> },
  { path: "/signup", element: <AuthPage signup /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Landing /> },
      {
        path: "/schedule",
        element: (
          <Suspense fallback={<p role="status">Loading schedule…</p>}>
            <SchedulePage />
          </Suspense>
        ),
      },
      {
        path: "/patients",
        element: (
          <Suspense fallback={<p role="status">Loading patients…</p>}>
            <PatientsPage />
          </Suspense>
        ),
      },
      {
        path: "/patients/:identity",
        element: (
          <Suspense fallback={<p role="status">Loading patient…</p>}>
            <PatientDetail />
          </Suspense>
        ),
      },
      {
        path: "/agents",
        element: (
          <Suspense fallback={<p role="status">Loading agents…</p>}>
            <AgentsPage />
          </Suspense>
        ),
      },
      {
        path: "/agents/:identity",
        element: (
          <Suspense fallback={<p role="status">Loading agent…</p>}>
            <AgentEditor />
          </Suspense>
        ),
      },
      { path: "/setup", element: <SetupPage /> },
      { path: "/clinic", element: <ClinicPage /> },
      { path: "/providers", element: <ProvidersPage /> },
      { path: "/services", element: <ServicesPage /> },
      { path: "/hours", element: <HoursPage /> },
      { path: "/staff", element: <StaffPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];
export const createAppRouter = () => createBrowserRouter(routes);
