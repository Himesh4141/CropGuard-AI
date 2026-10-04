import type {
  CropField,
  FieldCreate,
  FieldUpdate,
} from "@/features/fields/types";

import {
  apiClient,
} from "@/services/apiClient";


export const fieldApi = {
  async list(
    farmId?: string,
  ): Promise<CropField[]> {
    const response =
      await apiClient.get<CropField[]>(
        "/fields",
        {
          params:
            farmId
              ? {
                  farm_id:
                    farmId,
                }
              : undefined,
        },
      );

    return response.data;
  },

  async create(
    payload: FieldCreate,
  ): Promise<CropField> {
    const response =
      await apiClient.post<CropField>(
        "/fields",
        payload,
      );

    return response.data;
  },

  async update(
    fieldId: string,
    payload: FieldUpdate,
  ): Promise<CropField> {
    const response =
      await apiClient.patch<CropField>(
        `/fields/${fieldId}`,
        payload,
      );

    return response.data;
  },

  async remove(
    fieldId: string,
  ): Promise<void> {
    await apiClient.delete(
      `/fields/${fieldId}`,
    );
  },
};
