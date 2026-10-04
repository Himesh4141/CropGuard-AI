export interface RiskRequest {
  temperature_c: number;
  humidity_percent: number;
  rainfall_mm: number;
  leaf_wetness_hours: number;
}

export interface RiskResponse {
  score: number;
  level: string;
  factors: string[];
}