import type {
  OfficerCase,
  OfficerHighRiskField,
  OfficerSummary,
} from "@/features/officer/types";

import {
  apiClient,
} from "@/services/apiClient";


export const officerApi = {
  async summary():
    Promise<OfficerSummary> {
    const response =
      await apiClient.get<
        OfficerSummary
      >(
        "/officer/summary",
      );

    return response.data;
  },

  async cases():
    Promise<OfficerCase[]> {
    const response =
      await apiClient.get<
        OfficerCase[]
      >(
        "/officer/cases",
      );

    return response.data;
  },

  async highRiskFields():
    Promise<
      OfficerHighRiskField[]
    > {
    const response =
      await apiClient.get<
        OfficerHighRiskField[]
      >(
        "/officer/high-risk-fields",
      );

    return response.data;
  },
};
