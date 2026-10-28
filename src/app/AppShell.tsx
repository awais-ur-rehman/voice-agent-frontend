import { useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "./auth";
export function AppShell() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const clinic = useQuery({
    queryKey: useSessionKey("GET /dashboard/clinic", undefined, undefined),
    queryFn: ({ signal }) => auth.request("GET /dashboard/clinic", { signal }),
    enabled: !!auth.me,
  });
  if (!auth.me) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>Clinic workspace</span>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation" onClick={() => setOpen(false)}>
          <NavLink to="/setup">Setup checklist</NavLink>
          <NavLink to="/clinic">Clinic profile</NavLink>
          <NavLink to="/providers">Providers</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/hours">Hours & exceptions</NavLink>
          {auth.isManager && <NavLink to="/staff">Team access</NavLink>}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{auth.me.email[0]?.toUpperCase()}</span>
          <div>
            <strong>{auth.me.role}</strong>
            <small>{auth.me.email}</small>
          </div>
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <button
            className="menu-toggle button secondary"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            Menu
          </button>
          <strong dir="auto">{clinic.data?.name ?? "Clinic workspace"}</strong>
          <div className="topbar-actions">
            <span>{clinic.data?.timezone}</span>
            <button
              className="button secondary"
              onClick={() => void auth.logout()}
            >
              Sign out
            </button>
          </div>
        </header>
        <main id="workspace" className="workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
