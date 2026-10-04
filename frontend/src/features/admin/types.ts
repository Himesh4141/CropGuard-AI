import type {
  UserRole,
} from "@/types/user";


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
}
