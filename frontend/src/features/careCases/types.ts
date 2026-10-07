export type CareCaseStatus =
  | "open"
  | "monitoring"
  | "escalated"
  | "resolved";

export type CareCaseTrend =
  | "new"
  | "improving"
  | "same"
  | "worsening";

export type CareCasePriority =
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type CareCaseEventType =
  | "system"
  | "farmer_update"
  | "officer_guidance"
  | "status_change";

export interface CareCaseActionPlan {
  immediate_actions: string[];
  monitor_for: string[];
  prevention: string[];
  escalation_triggers: string[];
  follow_up_hours: number;
}

export interface CareCaseUpdate {
  id: string;
  event_type: CareCaseEventType;
  actor_role: "farmer" | "extension_officer" | "admin" | null;
  actor_name: string | null;
  trend: CareCaseTrend | null;
  note: string | null;
  recommendation: string | null;
  diagnosis_id: string | null;
  created_at: string;
}

export interface CareCase {
  id: string;
  field_id: string;
  farmer_id: string;
  initial_diagnosis_id: string | null;
  latest_diagnosis_id: string | null;
  status: CareCaseStatus;
  priority: CareCasePriority;
  trend: CareCaseTrend;
  current_label: string | null;
  current_confidence: number | null;
  severity: string | null;
  advisory: string | null;
  action_plan: CareCaseActionPlan;
  next_follow_up_at: string | null;
  last_follow_up_at: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  field_name: string;
  crop_name: string;
  farm_name: string;
  village: string | null;
  district: string | null;
  state: string | null;
  farmer_name: string;
  farmer_email: string;
  updates: CareCaseUpdate[];
}

export interface FarmerFollowUpPayload {
  trend: Exclude<CareCaseTrend, "new">;
  note?: string;
  file?: File | null;
}

export interface OfficerGuidancePayload {
  note: string;
  follow_up_hours?: number | null;
  escalate: boolean;
}
