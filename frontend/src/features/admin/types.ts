import type { UserRole } from "@/types/user";

export interface AdminSummary {
  total_users: number;
  active_users: number;
  farmers: number;
  extension_officers: number;
  admins: number;
  farms: number;
  fields: number;
  diagnoses: number;
  alerts: number;
  unread_alerts: number;
  high_risk_fields: number;
  open_care_cases: number;
  escalated_care_cases: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  farm_count: number;
  field_count: number;
  diagnosis_count: number;
  created_at: string;
  service_state: string | null;
  service_district: string | null;
  service_latitude: number | null;
  service_longitude: number | null;
  coverage_radius_km: number | null;
}

export interface OfficerServiceAreaPayload {
  state: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  coverage_radius_km: number;
}

export interface AdminLocationItem {
  country: string;
  state: string;
  district: string;
  farmers: number;
  farms: number;
  fields: number;
  diagnoses: number;
  high_risk_fields: number;
  open_care_cases: number;
  escalated_care_cases: number;
  assigned_officers: number;
}
