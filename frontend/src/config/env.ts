import { z } from "zod";
const schema = z.object({
  VITE_APP_NAME: z.string().min(1).default("CropGuard"),
  VITE_GOOGLE_WEB_CLIENT_ID: z.string().default("520759216755-0fjb86mbuehgvh52v3rhcgh2qq8cvlv4.apps.googleusercontent.com"),
  VITE_GOOGLE_SIGN_IN_ENABLED: z.enum(["true", "false"]).default("true"),
  VITE_API_BASE_URL: z.string().url().default(
    import.meta.env.PROD
      ? "https://cropguard-api-himesh4141.onrender.com/api/v1"
      : "http://localhost:8000/api/v1",
  ).refine(value => !import.meta.env.PROD || value.startsWith("https://"),
    "Production API connections require HTTPS")
});
const result = schema.safeParse(import.meta.env);
if (!result.success) throw new Error("Invalid frontend environment configuration");
export const env = { APP_NAME: result.data.VITE_APP_NAME, API_BASE_URL: result.data.VITE_API_BASE_URL,
  GOOGLE_WEB_CLIENT_ID: result.data.VITE_GOOGLE_WEB_CLIENT_ID,
  GOOGLE_SIGN_IN_ENABLED: result.data.VITE_GOOGLE_SIGN_IN_ENABLED === "true",
} as const;
