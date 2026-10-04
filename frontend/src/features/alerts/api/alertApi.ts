import type {
  FieldAlert,
} from "@/features/alerts/types";

import {
  apiClient,
} from "@/services/apiClient";


export const alertApi = {
  async list(): Promise<FieldAlert[]> {
    const response =
      await apiClient.get<FieldAlert[]>(
        "/alerts",
      );

    return response.data;
  },

  async markRead(
    alertId: string,
  ): Promise<FieldAlert> {
    const response =
      await apiClient.patch<FieldAlert>(
        `/alerts/${alertId}/read`,
      );

    return response.data;
  },

  async markAllRead():
    Promise<FieldAlert[]> {
    const response =
      await apiClient.patch<FieldAlert[]>(
        "/alerts/read-all",
      );

    return response.data;
  },
};