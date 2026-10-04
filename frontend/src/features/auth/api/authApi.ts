import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "@/features/auth/types";

import { apiClient } from "@/services/apiClient";

import type { User } from "@/types/user";

export const authApi = {
  async login(
    payload: LoginPayload,
  ): Promise<AuthResponse> {
    const response =
      await apiClient.post<AuthResponse>(
        "/auth/login",
        payload,
      );

    return response.data;
  },

  async register(
    payload: RegisterPayload,
  ): Promise<AuthResponse> {
    const response =
      await apiClient.post<AuthResponse>(
        "/auth/register",
        payload,
      );

    return response.data;
  },

  async refresh(): Promise<AuthResponse> {
    const response =
      await apiClient.post<AuthResponse>(
        "/auth/refresh",
      );

    return response.data;
  },

  async me(): Promise<User> {
    const response =
      await apiClient.get<User>(
        "/users/me",
      );

    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post(
      "/auth/logout",
    );
  },
};
