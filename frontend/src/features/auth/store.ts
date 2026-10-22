import {
  create,
} from "zustand";

import {
  authApi,
} from "@/features/auth/api/authApi";

import {
  tokenStorage,
} from "@/services/tokenStorage";

import type {
  User,
} from "@/types/user";
import { secureSession } from "@/services/secureSession";
import { ApiClientError } from "@/services/apiError";
import { recordAuthTiming, type AuthTimingOutcome } from "@/services/authTiming";


const EXPLICIT_SIGNOUT_KEY =
  "cropguard:explicit-signout";


function markExplicitSignOut(): void {
  try {
    window.localStorage.setItem(
      EXPLICIT_SIGNOUT_KEY,
      "1",
    );
  } catch {
    // Local storage may be unavailable in restricted browsers.
  }
}


function clearExplicitSignOut(): void {
  try {
    window.localStorage.removeItem(
      EXPLICIT_SIGNOUT_KEY,
    );
  } catch {
    // Local storage may be unavailable in restricted browsers.
  }
}


function wasExplicitlySignedOut(): boolean {
  try {
    return (
      window.localStorage.getItem(
        EXPLICIT_SIGNOUT_KEY,
      ) === "1"
    );
  } catch {
    return false;
  }
}


interface AuthState {
  user: User | null;

  initialized: boolean;

  initializing: boolean;

  restoreNeedsNetwork: boolean;

  retryRestore: () => Promise<void>;

  setSession: (
    user: User,
    token: string,
  ) => void;

  updateUser: (
    user: User,
  ) => void;

  clearSession: () => void;

  initialize: () => Promise<void>;

  logout: () => Promise<void>;
}


export const useAuthStore =
  create<AuthState>()(
    (set, get) => ({
      user: null,

      initialized: false,

      initializing: false,
      restoreNeedsNetwork: false,

      retryRestore: async () => {
        set({ initialized: false, initializing: false, restoreNeedsNetwork: false });
        await get().initialize();
      },

      setSession: (
        user,
        token,
      ) => {
        clearExplicitSignOut();

        tokenStorage.set(
          token,
        );

        set({
          user,
          initialized: true,
          initializing: false,
          restoreNeedsNetwork: false,
        });
      },

      updateUser: (
        user,
      ) => {
        set({
          user,
        });
      },

      clearSession: () => {
        tokenStorage.clear();

        set({
          user: null,
          initialized: true,
          initializing: false,
          restoreNeedsNetwork: false,
        });
      },

      initialize: async () => {
        const state =
          get();

        if (
          state.initialized
          || state.initializing
        ) {
          return;
        }

        if (
          wasExplicitlySignedOut()
        ) {
          tokenStorage.clear();

          set({
            user: null,
            initialized: true,
            initializing: false,
          });

          return;
        }

        set({
          initializing: true,
        });
        const startedAt = performance.now();
        let outcome: AuthTimingOutcome = "error";

        try {
          if (secureSession.isNative() && !(await secureSession.read())) {
            set({ user: null, initialized: true, initializing: false });
            outcome = "no-session";
            return;
          }
          const data =
            await authApi.refresh();

          tokenStorage.set(
            data.access_token,
          );

          set({
            user:
              data.user,

            initialized:
              true,

            initializing:
              false,
          });
          outcome = "success";
        } catch (error) {
          tokenStorage.clear();
          const invalid = error instanceof ApiClientError && error.status === 401;
          if (invalid) {
            void secureSession.clear();
          }
          // Show a retry option; do not imply the mobile account was logged out.
          set({
            user: null,
            initialized: true,
            initializing: false,
            restoreNeedsNetwork: secureSession.isNative() && !invalid,
          });
        } finally {
          recordAuthTiming("session-restore", startedAt, outcome);
        }
      },

      logout: async () => {
        /*
         * Logout must be instant for the user.
         *
         * Render Free may need time to wake up. We therefore clear the
         * local authenticated state first and revoke the server refresh
         * session in the background.
         */
        markExplicitSignOut();

        tokenStorage.clear();

        set({
          user: null,
          initialized: true,
          initializing: false,
          restoreNeedsNetwork: false,
        });

        void authApi
          .logout()
          .catch(() => {
            /*
             * Local logout has already succeeded.
             * The explicit-signout flag prevents a stale refresh cookie
             * from silently logging the user back in.
             */
          });
      },
    }),
  );


window.addEventListener(
  "cropguard:auth-expired",
  () => {
    useAuthStore
      .getState()
      .clearSession();
  },
);
