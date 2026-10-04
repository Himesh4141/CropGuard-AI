import type {
  Farm,
  FarmCreate,
  FarmUpdate,
} from "@/features/farms/types";

import {
  apiClient,
} from "@/services/apiClient";


export const farmApi = {
  async list(): Promise<Farm[]> {
    const response =
      await apiClient.get<Farm[]>(
        "/farms",
      );

    return response.data;
  },

  async create(
    payload: FarmCreate,
  ): Promise<Farm> {
    const response =
      await apiClient.post<Farm>(
        "/farms",
        payload,
      );

    return response.data;
  },

  async update(
    farmId: string,
    payload: FarmUpdate,
  ): Promise<Farm> {
    const response =
      await apiClient.patch<Farm>(
        `/farms/${farmId}`,
        payload,
      );

    return response.data;
  },

  async remove(
    farmId: string,
  ): Promise<void> {
    await apiClient.delete(
      `/farms/${farmId}`,
    );
  },
};
