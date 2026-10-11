import type { ImageAssessment } from "./imageAssessment";

export type PlantChoice = "tulsi" | "pothos" | "unknown";
export type Symptom = "spots" | "yellowing" | "whiteCoating" | "holes" | "wilting" | "curling";

export const plantNames: Record<PlantChoice, string> = {
  tulsi: "Tulsi / Holy Basil",
  pothos: "Money Plant / Pothos",
  unknown: "Plant identity not confirmed",
};
export const symptomLabels: Record<Symptom, string> = {
  spots: "Brown or dark spots on leaves",
  yellowing: "Yellowing or pale leaves",
  whiteCoating: "White powdery or dusty coating",
  holes: "Holes or feeding marks",
  wilting: "Drooping or wilting",
  curling: "Curled or distorted leaves",
};

/** Plant care, not an image-verified pathogen diagnosis. */
export function buildCareGuide(plant: PlantChoice, symptoms: Symptom[], image: ImageAssessment): string[] {
  if (!image.usable) return [
    "Take another close photograph in indirect daylight with the leaf in focus.",
    "Meanwhile, check soil moisture and drainage. Avoid applying chemicals based on a poor-quality photo.",
  ];
  const suggestions: string[] = [];
  if (plant === "tulsi") {
    suggestions.push("Tulsi: provide appropriate direct sunlight, good airflow and a container with drainage. Water when the upper soil begins drying; do not leave roots standing in water.");
  } else if (plant === "pothos") {
    suggestions.push("Money Plant/Pothos: bright indirect light is usually preferable. Avoid harsh afternoon sun and prolonged waterlogging; let the surface soil dry slightly between waterings.");
  } else {
    suggestions.push("Confirm the plant species before acting on species-specific watering, light or treatment advice.");
  }
  const flags = new Set(symptoms);
  if (image.signals.includes("yellow_tones")) flags.add("yellowing");
  if (image.signals.includes("brown_tones")) flags.add("spots");
  if (image.signals.includes("pale_tones")) flags.add("whiteCoating");
  if (flags.has("yellowing")) suggestions.push("For leaf yellowing, check soil moisture, drainage, recent repotting and whether only older leaves are affected. Yellowing is not specific to infection.");
  if (flags.has("spots")) suggestions.push("If spots are on the leaves, photograph both surfaces, increase airflow and avoid routinely wetting the foliage. Separate the plant from nearby plants if lesions are spreading.");
  if (flags.has("whiteCoating")) suggestions.push("Pale regions may be dust, residue or a fungus-like coating. Inspect the leaf closely before cleaning or treating anything.");
  if (flags.has("holes")) suggestions.push("Look under leaves at different times for snails, caterpillars and chewing insects. Remove visible pests manually where practical.");
  if (flags.has("wilting")) suggestions.push("Feel the soil below the surface. Both dry soil and persistently wet roots can produce wilting; do not automatically add more water.");
  if (flags.has("curling")) suggestions.push("Inspect tender growth and the underside of curled leaves for insects; also check sudden heat or watering changes.");
  if (!flags.size) suggestions.push("No clear concerns were reported or screened. Continue checking new growth and retake photos over the next few days; a normal-looking photo does not prove a plant is disease-free.");
  suggestions.push("Seek local horticultural advice if damage spreads, leaves drop rapidly or the plant declines. Do not select pesticides or fungicides from this screening alone.");
  return suggestions;
}
