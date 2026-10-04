import {
  useAuthStore,
} from "@/features/auth/store";


export function useAuth() {
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

  const logout =
    useAuthStore(
      (state) =>
        state.logout,
    );

  return {
    user,

    initialized,

    initializing,

    isAuthenticated:
      user !== null,

    logout,
  };
}
