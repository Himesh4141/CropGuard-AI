import type {
  User,
} from "@/types/user";

import {
  apiClient,
} from "@/services/apiClient";


export interface ProfileUpdatePayload {
  full_name: string;
}


export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}


export const profileApi = {
  async update(
    payload: ProfileUpdatePayload,
  ): Promise<User> {
    const response =
      await apiClient.patch<User>(
        "/users/me",
        payload,
      );

    return response.data;
  },

  async changePassword(
    payload: PasswordChangePayload,
  ): Promise<void> {
    await apiClient.post(
      "/users/me/password",
      payload,
    );
  },
};
