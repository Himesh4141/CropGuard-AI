import {
  HeartPulse,
  LayoutDashboard,
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
  [routes.dashboard, "Home", LayoutDashboard],
  [routes.farms, "Farms", Sprout],
  [routes.diagnose, "Detect", Microscope],
  [routes.careCases, "Care", HeartPulse],
] as const;

const officerItems = [
  [routes.officer, "Overview", LayoutDashboard],
  [routes.officerCases, "Cases", Stethoscope],
  [routes.officerCareCases, "Care", HeartPulse],
] as const;

const adminItems = [
  [routes.admin, "Admin", ShieldCheck],
  [routes.adminUsers, "Users", Users],
  [routes.adminLocations, "Areas", MapPinned],
  [routes.adminCareCases, "Care", HeartPulse],
] as const;

export function MobileNavigation() {
  const user = useAuthStore((state) => state.user);
  const items =
    user?.role === "admin"
      ? adminItems
      : user?.role === "extension_officer"
        ? officerItems
        : farmerItems;

  return (
    <nav className="mobile-nav" aria-label="Primary navigation">
      {items.map(([path, label, Icon]) => (
        <NavLink
          key={path}
          to={path}
          end={path === routes.admin || path === routes.officer}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
