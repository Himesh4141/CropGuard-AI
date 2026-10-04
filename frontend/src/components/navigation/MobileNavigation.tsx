import {
  Bell,
  LayoutDashboard,
  Microscope,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Users,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

import {
  routes,
} from "@/config/routes";

import {
  useAuthStore,
} from "@/features/auth/store";


const farmerItems = [
  [
    routes.dashboard,
    "Home",
    LayoutDashboard,
  ],
  [
    routes.farms,
    "Farms",
    Sprout,
  ],
  [
    routes.diagnose,
    "Detect",
    Microscope,
  ],
  [
    routes.alerts,
    "Alerts",
    Bell,
  ],
] as const;


const officerItems = [
  [
    routes.officer,
    "Overview",
    LayoutDashboard,
  ],
  [
    routes.officerCases,
    "Cases",
    Stethoscope,
  ],
] as const;


const adminItems = [
  [
    routes.admin,
    "Admin",
    ShieldCheck,
  ],
  [
    routes.adminUsers,
    "Users",
    Users,
  ],
] as const;


export function MobileNavigation() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const items =
    user?.role === "admin"
      ? adminItems
      : user?.role
          === "extension_officer"
        ? officerItems
        : farmerItems;

  return (
    <nav className="mobile-nav">
      {items.map(
        ([
          path,
          label,
          Icon,
        ]) => (
          <NavLink
            key={path}
            to={path}
          >
            <Icon size={18} />

            <span>
              {label}
            </span>
          </NavLink>
        ),
      )}
    </nav>
  );
}
