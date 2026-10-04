export interface CurrentWeather {
  temperature_c: number;
  humidity_percent: number;
  precipitation_mm: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
}

export interface WeatherForecastDay {
  date: string;
  temperature_max_c: number;
  temperature_min_c: number;
  precipitation_mm: number;
  rainfall_mm: number;
  wind_speed_max_kmh: number;
}

export interface WeatherRiskSummary {
  score: number;
  level:
    | "low"
    | "moderate"
    | "high"
    | "critical"
    | string;
  factors: string[];
}

export interface FieldWeatherRisk {
  field_id: string;
  field_name: string;
  farm_id: string;
  farm_name: string;
  crop_name: string;
  latitude: number;
  longitude: number;
  provider: string;
  observed_at: string;
  cached: boolean;
  current: CurrentWeather;
  forecast: WeatherForecastDay[];
  risk: WeatherRiskSummary;
}