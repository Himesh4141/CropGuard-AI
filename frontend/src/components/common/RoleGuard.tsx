import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { routes } from "@/config/routes";
import { useAuthStore } from "@/features/auth/store";
import type { UserRole } from "@/types/user";
export function RoleGuard({ children, roles }: { children: ReactNode; roles: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) return <Navigate to={routes.dashboard} replace />;
  return children;
}
