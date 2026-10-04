import { z } from "zod";
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(72) });
export const registerSchema = loginSchema.extend({ full_name: z.string().min(2).max(120) });
