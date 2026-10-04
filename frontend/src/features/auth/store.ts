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


interface AuthState {
  user: User | null;

  initialized: boolean;

  initializing: boolean;

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

      setSession: (
        user,
        token,
      ) => {
        tokenStorage.set(
          token,
        );

        set({
          user,
          initialized: true,
          initializing: false,
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

        set({
          initializing: true,
        });

        try {
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
        } catch {
          tokenStorage.clear();

          set({
            user: null,
            initialized: true,
            initializing: false,
          });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          tokenStorage.clear();

          set({
            user: null,
            initialized: true,
            initializing: false,
          });
        }
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
