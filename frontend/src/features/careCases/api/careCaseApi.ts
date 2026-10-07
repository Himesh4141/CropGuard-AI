import type {
  CareCase,
  FarmerFollowUpPayload,
  OfficerGuidancePayload,
} from "@/features/careCases/types";

import {
  apiClient,
} from "@/services/apiClient";


export const careCaseApi = {
  async farmerCases(): Promise<CareCase[]> {
    const response = await apiClient.get<CareCase[]>(
      "/care-cases",
    );

    return response.data;
  },

  async farmerFollowUp(
    caseId: string,
    payload: FarmerFollowUpPayload,
  ): Promise<CareCase> {
    const body = new FormData();

    body.append(
      "trend",
      payload.trend,
    );

    if (payload.note?.trim()) {
      body.append(
        "note",
        payload.note.trim(),
      );
    }

    if (payload.file) {
      body.append(
        "file",
        payload.file,
      );
    }

    const response = await apiClient.post<CareCase>(
      `/care-cases/${caseId}/follow-up`,
      body,
    );

    return response.data;
  },

  async farmerResolve(
    caseId: string,
    note?: string,
  ): Promise<CareCase> {
    const response = await apiClient.post<CareCase>(
      `/care-cases/${caseId}/resolve`,
      {
        note: note?.trim() || null,
      },
    );

    return response.data;
  },

  async officerCases(): Promise<CareCase[]> {
    const response = await apiClient.get<CareCase[]>(
      "/officer/care-cases",
    );

    return response.data;
  },

  async officerGuidance(
    caseId: string,
    payload: OfficerGuidancePayload,
  ): Promise<CareCase> {
    const response = await apiClient.post<CareCase>(
      `/officer/care-cases/${caseId}/guidance`,
      payload,
    );

    return response.data;
  },

  async officerResolve(
    caseId: string,
    note?: string,
  ): Promise<CareCase> {
    const response = await apiClient.post<CareCase>(
      `/officer/care-cases/${caseId}/resolve`,
      {
        note: note?.trim() || null,
      },
    );

    return response.data;
  },

  async adminCases(): Promise<CareCase[]> {
    const response = await apiClient.get<CareCase[]>(
      "/admin/care-cases",
    );

    return response.data;
  },
};
