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
  common_names?: readonly string[];
  genus?: string | null;
  family?: string | null;
  flower_match?: string | null;
  candidates?: readonly FlowerCandidate[];
};

/** A conservative UI guard while older Render deployments may still use a 45% cutoff. */
export const MIN_IDENTIFICATION_SCORE = 0.70;

export function normalizeIdentity(data: PlantIdentity): PlantIdentity {
  const text = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) || null : null;
  data = {
    ...data,
    genus: text(data.genus, 120), family: text(data.family, 120),
    common_names: Array.isArray(data.common_names) ? [...new Set(data.common_names.map(name => text(name, 120)).filter((name): name is string => Boolean(name)))].slice(0, 5) : [],
    candidates: Array.isArray(data.candidates) ? data.candidates.filter(candidate =>
      candidate && typeof candidate.scientific_name === "string" && candidate.scientific_name.trim() &&
      typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence) && candidate.confidence >= 0 && candidate.confidence <= 1
    ).slice(0, 5).map(candidate => ({ scientific_name: candidate.scientific_name.trim().slice(0, 180),
      common_name: text(candidate.common_name, 120), confidence: candidate.confidence, flower_id: text(candidate.flower_id, 120) })) : [],
  };
  if (data.status === "identified" && data.confidence < MIN_IDENTIFICATION_SCORE) {
    return {
      ...data,
      status: "uncertain",
      plant: "unknown",
      flower_match: null,
      message: `Possible match only (${Math.round(data.confidence * 100)}% provider score). A single photograph may not distinguish similar species; use general care until identity is confirmed.`,
    };
  }
  return data.status === "identified" ? data : { ...data, plant: "unknown", flower_match: null };
}

export async function identifyPlant(image: File, photoPrepared = false, additionalImages: File[] = []): Promise<PlantIdentity> {
  if (additionalImages.length > 2) throw new Error("Use up to three photos of the same plant.");
  if ([image, ...additionalImages].reduce((bytes, file) => bytes + file.size, 0) > 8 * 1024 * 1024) {
    throw new Error("The prepared photos exceed 8 MB. Select smaller images.");
  }
  const form = new FormData();
  form.append("image", image, image.name);
  additionalImages.forEach(file => form.append("additional_images", file, file.name));
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
