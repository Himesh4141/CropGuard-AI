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

export async function identifyPlant(image: File): Promise<PlantIdentity> {
  const form = new FormData();
  form.append("image", image, image.name);
  const { data } = await apiClient.post<PlantIdentity>("/home-planters/identify", form, { timeout: 30_000 });
  if (!["identified", "uncertain", "unknown"].includes(data.status) ||
      !["tulsi", "pothos", "unknown"].includes(data.plant) ||
      typeof data.confidence !== "number" || data.confidence < 0 || data.confidence > 1) {
    throw new Error("Plant identification returned an invalid result.");
  }
  return data;
}
