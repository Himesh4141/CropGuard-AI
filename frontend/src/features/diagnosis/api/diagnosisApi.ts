import type {
  CreateDiagnosisPayload,
  Diagnosis,
} from "@/features/diagnosis/types";

import {
  apiClient,
} from "@/services/apiClient";


export const diagnosisApi = {
  async list(): Promise<Diagnosis[]> {
    const response =
      await apiClient.get<Diagnosis[]>(
        "/diagnoses",
      );

    return response.data;
  },

  async create({
    fieldId,
    file,
  }: CreateDiagnosisPayload): Promise<Diagnosis> {
    const formData =
      new FormData();

    formData.append(
      "field_id",
      fieldId,
    );

    formData.append(
      "file",
      file,
    );

    const response =
      await apiClient.post<Diagnosis>(
        "/diagnoses",
        formData,
      );

    return response.data;
  },
};