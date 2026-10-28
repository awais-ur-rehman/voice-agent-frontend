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
import { HoursPage } from "../features/clinic/HoursPage";
export const routes = [
  { path: "/login", element: <AuthPage /> },
  { path: "/signup", element: <AuthPage signup /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/setup" replace /> },
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
