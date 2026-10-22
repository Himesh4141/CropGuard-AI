import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { routes } from "@/config/routes";
import { useAuthStore } from "@/features/auth/store";
import type { UserRole } from "@/types/user";

interface RoleRouteProps {
  roles: UserRole[];
  children: ReactNode;
}

/** Unauthorized routes redirect to the actor's OWN workspace, never Farmer. */
export function RoleRoute({ roles, children }: RoleRouteProps) {
  const user = useAuthStore(state => state.user);
  if (!user) return <Navigate to={routes.login} replace />;
  if (!roles.includes(user.role)) {
    const destination = user.role === "admin" ? routes.admin
      : user.role === "extension_officer" ? routes.officer : routes.dashboard;
    return <Navigate to={destination} replace />;
  }
  return <>{children}</>;
}
