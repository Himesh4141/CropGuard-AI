import {
  Bell,
  CloudSun,
  History,
  LayoutDashboard,
  Leaf,
  MapPinned,
  Microscope,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Users,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { routes } from "@/config/routes";
import { useAuthStore } from "@/features/auth/store";

const farmerItems = [
  [routes.dashboard, "Dashboard", LayoutDashboard],
  [routes.farms, "Farms", Sprout],
  [routes.fields, "Fields", Leaf],
  [routes.diagnose, "Disease Detection", Microscope],
  [routes.diagnosisHistory, "Diagnosis History", History],
  [routes.weather, "Weather & Risk", CloudSun],
  [routes.alerts, "Alerts", Bell],
] as const;

const officerItems = [
  [routes.officer, "Officer Dashboard", LayoutDashboard],
  [routes.officerCases, "Crop Cases", Stethoscope],
] as const;

const adminItems = [
  [routes.admin, "Admin Dashboard", ShieldCheck],
  [routes.adminUsers, "Users", Users],
  [routes.adminLocations, "Locations", MapPinned],
] as const;

export function Sidebar() {
  const user = useAuthStore((state) => state.user);

  const items =
    user?.role === "admin"
      ? adminItems
      : user?.role === "extension_officer"
        ? officerItems
        : farmerItems;

  const home =
    user?.role === "admin"
      ? routes.admin
      : user?.role === "extension_officer"
        ? routes.officer
        : routes.dashboard;

  return (
    <aside className="sidebar">
      <NavLink className="brand" to={home}>
        <span className="brand-icon"><Leaf size={20} /></span>
        <div><strong>CropGuard</strong><small>AI</small></div>
      </NavLink>

      <div className="sidebar-section-label">Workspace</div>

      <nav>
        {items.map(([path, label, Icon]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="platform-status"><span />Cloud services connected</div>
    </aside>
  );
}
