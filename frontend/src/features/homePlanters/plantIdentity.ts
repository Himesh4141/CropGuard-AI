import { apiClient } from "@/services/apiClient";
import type { PlantChoice } from "./careGuide";

/** Server-only Pl@ntNet key; the browser never contains credentials. */
export type PlantIdentity = {
  status: "identified" | "uncertain" | "unknown";
  plant: PlantChoice;
  confidence: number;
  scientific_name: string | null;
  common_name: string | null;
  message: string;
};

/** A conservative UI guard while older Render deployments may still use a 45% cutoff. */
export const MIN_IDENTIFICATION_SCORE = 0.70;

export function normalizeIdentity(data: PlantIdentity): PlantIdentity {
  if (data.status === "identified" && data.confidence < MIN_IDENTIFICATION_SCORE) {
    return {
      ...data,
      status: "uncertain",
      plant: "unknown",
      message: `Possible match only (${Math.round(data.confidence * 100)}% provider score). Retake a clear photo showing several leaves; do not rely on species-specific treatment.`,
    };
  }
  return data;
}

export async function identifyPlant(image: File): Promise<PlantIdentity> {
  const form = new FormData();
  form.append("image", image, image.name);
  const { data } = await apiClient.post<PlantIdentity>("/home-planters/identify", form, { timeout: 30_000 });
  if (!["identified", "uncertain", "unknown"].includes(data.status) ||
      !["tulsi", "pothos", "unknown"].includes(data.plant) ||
      typeof data.confidence !== "number" || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1) {
    throw new Error("Plant identification returned an invalid result.");
  }
  return normalizeIdentity(data);
}
