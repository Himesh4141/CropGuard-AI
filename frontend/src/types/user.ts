export type UserRole = "farmer" | "extension_officer" | "admin";
export interface User { id: string; email: string; full_name: string; role: UserRole; is_active: boolean; }
