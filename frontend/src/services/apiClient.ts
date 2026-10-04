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

    timeout: 20_000,

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

    timeout: 20_000,

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
  const response =
    await refreshClient.post<AuthResponse>(
      "/auth/refresh",
    );

  const token =
    response.data.access_token;

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
        } catch {
          tokenStorage.clear();

          notifyAuthExpired();
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
