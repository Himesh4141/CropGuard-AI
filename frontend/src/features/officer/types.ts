export interface OfficerSummary {
  farmers: number;
  farms: number;
  fields: number;
  diagnoses: number;
  unread_alerts: number;
  high_risk_fields: number;
}


export interface OfficerCase {
  diagnosis_id: string;
  field_id: string;
  field_name: string;
  farm_name: string;
  farmer_name: string;
  farmer_email: string;
  crop_name: string;
  predicted_label:
    string | null;
  confidence:
    number | null;
  severity:
    string | null;
  created_at: string;
  risk_score:
    number | null;
  risk_level:
    string | null;
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
}
