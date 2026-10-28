import { useRef, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "./auth";
export function AppShell() {
  const auth = useAuth();
  const location = useLocation();
  const inSettings = [
    "/clinic",
    "/providers",
    "/services",
    "/hours",
    "/staff",
    "/setup",
  ].includes(location.pathname);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const clinic = useQuery({
    queryKey: useSessionKey("GET /dashboard/clinic", undefined, undefined),
    queryFn: ({ signal }) => auth.request("GET /dashboard/clinic", { signal }),
    enabled: !!auth.me,
  });
  const setup = useQuery({
    queryKey: useSessionKey("GET /dashboard/setup", undefined, undefined),
    queryFn: ({ signal }) => auth.request("GET /dashboard/setup", { signal }),
    enabled: !!auth.me,
  });
  if (!auth.me) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      <button
        ref={menu}
        className="menu-toggle mobile-nav-trigger button secondary"
        aria-expanded={open}
        aria-controls="main-navigation"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        Menu
      </button>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>Clinic workspace</span>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          onClick={() => {
            setOpen(false);
            if (open) menu.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              menu.current?.focus();
            }
          }}
        >
          <NavLink to="/schedule">Schedule</NavLink>
          <NavLink to="/patients">Patients</NavLink>
          <NavLink to="/clinic" className={inSettings ? "active" : ""}>
            Clinic settings
          </NavLink>
          <div
            className="settings-subnav"
            role="group"
            aria-label="Clinic settings pages"
          >
            {setup.data && Object.values(setup.data).some((done) => !done) && (
              <NavLink to="/setup">Setup checklist</NavLink>
            )}
            <NavLink to="/clinic">Clinic profile</NavLink>
            <NavLink to="/providers">Providers</NavLink>
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/hours">Hours & exceptions</NavLink>
            {auth.isManager && <NavLink to="/staff">Team access</NavLink>}
          </div>
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
