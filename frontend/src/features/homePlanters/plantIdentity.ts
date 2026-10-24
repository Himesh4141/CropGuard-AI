/** Pl@ntNet candidates are ranked suggestions, not calibrated probabilities. */
export type FlowerCandidate = {
  scientific_name: string;
  common_name: string | null;
  confidence: number;
  flower_id: string | null;
};

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
  flower_match?: string | null;
  candidates?: readonly FlowerCandidate[];
};

/** A conservative UI guard while older Render deployments may still use a 45% cutoff. */
export const MIN_IDENTIFICATION_SCORE = 0.70;

export function normalizeIdentity(data: PlantIdentity): PlantIdentity {
  if (data.status === "identified" && data.confidence < MIN_IDENTIFICATION_SCORE) {
    return {
      ...data,
      status: "uncertain",
      plant: "unknown",
      message: `Possible match only (${Math.round(data.confidence * 100)}% provider score). A single photograph may not distinguish similar species; use general care until identity is confirmed.`,
    };
  }
  return data.status === "identified" ? data : { ...data, plant: "unknown" };
}

export async function identifyPlant(image: File, photoPrepared = false): Promise<PlantIdentity> {
  const form = new FormData();
  form.append("image", image, image.name);
  form.append("photo_prepared", String(photoPrepared));
  const { data } = await apiClient.post<PlantIdentity>("/home-planters/identify", form, { timeout: 30_000 });
  if (!data || typeof data !== "object" ||
      !["identified", "uncertain", "unknown"].includes(data.status) ||
      !["tulsi", "pothos", "unknown"].includes(data.plant) ||
      typeof data.confidence !== "number" || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1 ||
      !(data.scientific_name === null || typeof data.scientific_name === "string") ||
      !(data.common_name === null || typeof data.common_name === "string") || typeof data.message !== "string") {
    throw new Error("Plant identification returned an invalid result.");
  }
  return normalizeIdentity(data);
}
