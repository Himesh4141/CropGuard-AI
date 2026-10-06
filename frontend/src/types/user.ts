export type UserRole = "farmer" | "extension_officer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  service_state?: string | null;
  service_district?: string | null;
  service_latitude?: number | null;
  service_longitude?: number | null;
  coverage_radius_km?: number | null;
}
