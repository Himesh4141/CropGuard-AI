import {
  HeartPulse,
  Flower2,
  LayoutDashboard,
  MapPinned,
  Microscope,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Users,
} from "lucide-react";

import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { routes } from "@/config/routes";
import { cgText, useCropGuardLanguage } from "@/features/preferences/preferences";
import { useAuthStore } from "@/features/auth/store";
import { trackVisualViewportChrome } from "@/services/visualViewportChrome";

const farmerItems = [
  [routes.dashboard, "Home", LayoutDashboard],
  [routes.farms, "Farms", Sprout],
  [routes.diagnose, "Detect", Microscope],
  [routes.careCases, "Care", HeartPulse],
  [routes.homePlanters, "Plants", Flower2],
] as const;

const officerItems = [
  [routes.officer, "Overview", LayoutDashboard],
  [routes.officerCases, "Cases", Stethoscope],
  [routes.officerCareCases, "Care", HeartPulse],
  [routes.homePlanters, "Plants", Flower2],
] as const;

const adminItems = [
  [routes.admin, "Admin", ShieldCheck],
  [routes.adminUsers, "Users", Users],
  [routes.adminLocations, "Areas", MapPinned],
  [routes.adminCareCases, "Care", HeartPulse],
  [routes.homePlanters, "Plants", Flower2],
] as const;

export function MobileNavigation() {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    return trackVisualViewportChrome(nav, "navigation");
  }, []);
  const user = useAuthStore((state) => state.user);
  const language = useCropGuardLanguage();
  const items =
    user?.role === "admin"
      ? adminItems
      : user?.role === "extension_officer"
        ? officerItems
        : farmerItems;

  return (
    <nav ref={navRef} className="mobile-nav" aria-label="Primary navigation" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(([path, label, Icon]) => (
        <NavLink
          key={path}
          to={path}
          end={path === routes.admin || path === routes.officer}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          <Icon size={18} />
          <span>{cgText(label, language)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
