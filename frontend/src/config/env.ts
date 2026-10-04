import { z } from "zod";
const schema = z.object({
  VITE_APP_NAME: z.string().min(1).default("CropGuard AI"),
  VITE_API_BASE_URL: z.string().url().default("http://localhost:8000/api/v1")
});
const result = schema.safeParse(import.meta.env);
if (!result.success) throw new Error("Invalid frontend environment configuration");
export const env = { APP_NAME: result.data.VITE_APP_NAME, API_BASE_URL: result.data.VITE_API_BASE_URL } as const;
