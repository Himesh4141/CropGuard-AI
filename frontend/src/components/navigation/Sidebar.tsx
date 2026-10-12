import {
  Bell,
  CloudSun,
  History,
  HeartPulse,
  Flower2,
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
import approvedIcon from "@/assets/images/cropguard-approved-icon.png";
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
  [routes.careCases, "Care Cases", HeartPulse],
] as const;

const officerItems = [
  [routes.officer, "Officer Dashboard", LayoutDashboard],
  [routes.officerCases, "Crop Cases", Stethoscope],
  [routes.officerCareCases, "Care Follow-up", HeartPulse],
] as const;

const adminItems = [
  [routes.admin, "Admin Dashboard", ShieldCheck],
  [routes.adminUsers, "Users", Users],
  [routes.adminLocations, "Locations", MapPinned],
  [routes.adminCareCases, "Care Cases", HeartPulse],
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
        <span className="brand-icon"><img className="cropguard-brand-image" src={approvedIcon} alt="" /></span>
        <div><strong>CropGuard</strong></div>
      </NavLink>

      <div className="sidebar-section-label">Workspace</div>

      <nav>
        {items.map(([path, label, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path === routes.admin || path === routes.officer}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-section-label">Home Garden</div>
      <nav>
        <NavLink
          to={routes.homePlanters}
          className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
        >
          <Flower2 size={18} />
          <span>Home Planters</span>
        </NavLink>
      </nav>

      <div className="platform-status"><span />Cloud services connected</div>
    </aside>
  );
}
