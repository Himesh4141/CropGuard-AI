import type {
  FieldWeatherRisk,
} from "@/features/weather/types";

import {
  apiClient,
} from "@/services/apiClient";


export const weatherApi = {
  async getFieldWeather(
    fieldId: string,
  ): Promise<FieldWeatherRisk> {
    const response =
      await apiClient.get<FieldWeatherRisk>(
        `/weather/fields/${fieldId}`,
      );

    return response.data;
  },
};