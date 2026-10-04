import type {
  RiskRequest,
  RiskResponse,
} from "@/features/risk/types";

import {
  apiClient,
} from "@/services/apiClient";


export const riskApi = {
  async calculate(
    payload: RiskRequest,
  ): Promise<RiskResponse> {
    const response =
      await apiClient.post<RiskResponse>(
        "/risk/calculate",
        payload,
      );

    return response.data;
  },
};