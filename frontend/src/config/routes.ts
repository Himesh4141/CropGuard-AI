export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  farms: "/farms",
  fields: "/fields",
  diagnose: "/diagnose",
  diagnosisHistory:
    "/diagnosis-history",
  weather: "/weather",
  alerts: "/alerts",
  careCases: "/care-cases",
  profile: "/profile",
  officer: "/officer",
  officerCases:
    "/officer/cases",
  officerCareCases:
    "/officer/care-cases",
  admin: "/admin",
  adminUsers:
    "/admin/users",
  adminLocations:
    "/admin/locations",
  adminCareCases:
    "/admin/care-cases",
} as const;
