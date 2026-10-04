import type {
  AdminSummary,
  AdminUserItem,
} from "@/features/admin/types";

import {
  apiClient,
} from "@/services/apiClient";


export const adminApi = {
  async summary():
    Promise<AdminSummary> {
    const response =
      await apiClient.get<AdminSummary>(
        "/admin/summary",
      );

    return response.data;
  },

  async users():
    Promise<AdminUserItem[]> {
    const response =
      await apiClient.get<
        AdminUserItem[]
      >(
        "/admin/users",
      );

    return response.data;
  },

  async setUserActive(
    userId: string,
    isActive: boolean,
  ): Promise<AdminUserItem> {
    const response =
      await apiClient.patch<
        AdminUserItem
      >(
        `/admin/users/${userId}/active`,
        {
          is_active:
            isActive,
        },
      );

    return response.data;
  },
};
