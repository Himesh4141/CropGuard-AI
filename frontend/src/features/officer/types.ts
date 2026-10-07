export interface OfficerServiceArea {
  scope_mode: "assigned" | "global" | string;
  state: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  coverage_radius_km: number | null;
}

export interface OfficerSummary {
  farmers: number;
  farms: number;
  fields: number;
  diagnoses: number;
  unread_alerts: number;
  high_risk_fields: number;
  open_care_cases: number;
  escalated_care_cases: number;
  service_area: OfficerServiceArea;
}

export interface OfficerCase {
  diagnosis_id: string;
  field_id: string;
  field_name: string;
  farm_name: string;
  farmer_name: string;
  farmer_email: string;
  crop_name: string;
  predicted_label: string | null;
  confidence: number | null;
  severity: string | null;
  created_at: string;
  risk_score: number | null;
  risk_level: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
}

export interface OfficerHighRiskField {
  field_id: string;
  field_name: string;
  farm_name: string;
  farmer_name: string;
  crop_name: string;
  risk_score: number;
  risk_level: string;
  observed_at: string;
  village: string | null;
  district: string | null;
  state: string | null;
}
