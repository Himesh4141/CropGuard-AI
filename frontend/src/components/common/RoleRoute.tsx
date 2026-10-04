import type {
  ReactNode,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  routes,
} from "@/config/routes";

import {
  useAuthStore,
} from "@/features/auth/store";

import type {
  UserRole,
} from "@/types/user";


interface RoleRouteProps {
  roles: UserRole[];
  children: ReactNode;
}


export function RoleRoute({
  roles,
  children,
}: RoleRouteProps) {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  if (!user) {
    return (
      <Navigate
        to={routes.login}
        replace
      />
    );
  }

  if (
    !roles.includes(
      user.role,
    )
  ) {
    return (
      <Navigate
        to={routes.dashboard}
        replace
      />
    );
  }

  return children;
}
