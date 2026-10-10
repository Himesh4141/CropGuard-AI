import axios, {
  type InternalAxiosRequestConfig,
} from "axios";

import { env } from "@/config/env";

import type {
  AuthResponse,
} from "@/features/auth/types";

import {
  normalizeApiError,
} from "@/services/apiError";

import {
  tokenStorage,
} from "@/services/tokenStorage";



interface RetriableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}


export const apiClient =
  axios.create({
    baseURL:
      env.API_BASE_URL,

    timeout: 75_000,

    withCredentials: true,

    headers: {
      Accept:
        "application/json",
    },
  });


const refreshClient =
  axios.create({
    baseURL:
      env.API_BASE_URL,

    timeout: 75_000,

    withCredentials: true,

    headers: {
      Accept:
        "application/json",
    },
  });


let refreshPromise:
  Promise<string> | null = null;


function isAuthEndpoint(
  url?: string,
): boolean {
  if (!url) {
    return false;
  }

  return [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
    "/auth/mobile/login",
    "/auth/mobile/register",
    "/auth/mobile/refresh",
    "/auth/mobile/logout",
  ].some(
    (path) =>
      url.includes(path),
  );
}


function notifyAuthExpired(): void {
  window.dispatchEvent(
    new Event(
      "cropguard:auth-expired",
    ),
  );
}


async function refreshAccessToken():
  Promise<string> {
  const { secureSession } = await import("@/services/secureSession");
  let token: string;
  if (secureSession.isNative()) {
    const refreshToken = await secureSession.read();
    if (!refreshToken) throw new Error("No stored mobile session");
    const response = await refreshClient.post<AuthResponse & { refresh_token: string }>(
      "/auth/mobile/refresh", { refresh_token: refreshToken },
    );
    await secureSession.save(response.data.refresh_token);
    token = response.data.access_token;
  } else {
    const response = await refreshClient.post<AuthResponse>("/auth/refresh");
    token = response.data.access_token;
  }

  tokenStorage.set(
    token,
  );

  return token;
}


apiClient.interceptors.request.use(
  (
    config:
      InternalAxiosRequestConfig,
  ) => {
    const token =
      tokenStorage.get();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
);


apiClient.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !isAuthEndpoint(
        error.config.url,
      )
    ) {
      const originalRequest =
        error.config as
          RetriableRequestConfig;

      if (
        !originalRequest._retry
      ) {
        originalRequest._retry =
          true;

        try {
          if (!refreshPromise) {
            refreshPromise =
              refreshAccessToken()
                .finally(() => {
                  refreshPromise =
                    null;
                });
          }

          const token =
            await refreshPromise;

          originalRequest.headers.Authorization =
            `Bearer ${token}`;

          return apiClient(
            originalRequest,
          );
        } catch (refreshError) {
          // A sleeping Render service is not an invalid session.
          // Keep the encrypted refresh credential for the next app start.
          if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
            tokenStorage.clear();
            notifyAuthExpired();
          }
        }
      }
    }

    return Promise.reject(
      normalizeApiError(
        error,
      ),
    );
  },
);
