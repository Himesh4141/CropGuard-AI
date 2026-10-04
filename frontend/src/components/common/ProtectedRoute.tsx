import {
  useEffect,
  type ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  PageLoader,
} from "@/components/common/PageLoader";

import {
  routes,
} from "@/config/routes";

import {
  useAuthStore,
} from "@/features/auth/store";


interface ProtectedRouteProps {
  children: ReactNode;
}


export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const location =
    useLocation();

  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const initialized =
    useAuthStore(
      (state) =>
        state.initialized,
    );

  const initializing =
    useAuthStore(
      (state) =>
        state.initializing,
    );

  const initialize =
    useAuthStore(
      (state) =>
        state.initialize,
    );


  useEffect(() => {
    if (
      !initialized &&
      !initializing
    ) {
      void initialize();
    }
  }, [
    initialize,
    initialized,
    initializing,
  ]);


  if (
    !initialized ||
    initializing
  ) {
    return (
      <PageLoader />
    );
  }


  if (!user) {
    return (
      <Navigate
        to={routes.login}
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }


  return children;
}
