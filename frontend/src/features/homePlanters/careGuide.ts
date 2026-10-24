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
  // Guidance must not disappear just because an inexpensive phone photo is dim
  // or blurry. Give safe care actions while clearly labeling uncertainty.
  const suggestions: string[] = [];
  if (plant === "tulsi") {
    suggestions.push("Tulsi: provide appropriate direct sunlight, good airflow and a container with drainage. Water when the upper soil begins drying; do not leave roots standing in water.");
  } else if (plant === "pothos") {
    suggestions.push("Money Plant/Pothos: bright indirect light is usually preferable. Avoid harsh afternoon sun and prolonged waterlogging; let the surface soil dry slightly between waterings.");
  } else {
    suggestions.push("Confirm the plant species before acting on species-specific watering, light or treatment advice.");
  }
  const flags = new Set(symptoms);
  // Color screening only detects nearby pixels. Do not turn image signals into
  // user-confirmed symptoms (especially golden/cream natural variegation).
  if (image.signals.includes("yellow_tones")) {
    suggestions.push(plant === "pothos"
      ? "Golden or cream patterns on Pothos leaves can be natural variegation. Compare the same pattern on healthy new growth before treating it as yellowing or disease."
      : "Yellow-looking areas in a photo can be natural variegation or lighting. Check the actual leaves before calling it yellowing.");
  }
  if (image.signals.includes("brown_tones")) suggestions.push("Brown-colored areas detected in the photo may be pots, shadows or stems rather than leaf lesions; inspect the leaf surface.");
  if (image.signals.includes("pale_tones")) suggestions.push("Pale areas may be naturally patterned leaves, highlights or residue; do not infer a fungal coating from color alone.");
  if (flags.has("yellowing")) suggestions.push("If leaves are truly turning yellow compared with their normal pattern, check soil moisture, drainage, recent repotting and whether only older leaves are affected. Yellowing alone does not diagnose infection.");
  if (flags.has("spots")) suggestions.push("If spots are on the leaves, photograph both surfaces, increase airflow and avoid routinely wetting the foliage. Separate the plant from nearby plants if lesions are spreading.");
  if (flags.has("whiteCoating")) suggestions.push("Pale regions may be dust, residue or a fungus-like coating. Inspect the leaf closely before cleaning or treating anything.");
  if (flags.has("holes")) suggestions.push("Look under leaves at different times for snails, caterpillars and chewing insects. Remove visible pests manually where practical.");
  if (flags.has("wilting")) suggestions.push("Feel the soil below the surface. Both dry soil and persistently wet roots can produce wilting; do not automatically add more water.");
  if (flags.has("curling")) suggestions.push("Inspect tender growth and the underside of curled leaves for insects; also check sudden heat or watering changes.");
  if (!flags.size && !image.signals.length) suggestions.push("No strong color patterns or symptoms were reported. Keep monitoring new growth; a normal-looking photo does not prove a plant is disease-free.");
  if (!flags.size && image.signals.length) suggestions.push("These are photo color observations only, not confirmed damage. Monitor changes over time and compare with normal leaf patterns.");
  suggestions.push("Seek local horticultural advice if damage spreads, leaves drop rapidly or the plant declines. Do not select pesticides or fungicides from this screening alone.");
  return suggestions;
}

/** A differential observation based ONLY on user-reported symptoms, not an image diagnosis. */
export function possibleCareConcern(symptoms: Symptom[], image: ImageAssessment): string {
  if (!image.usable) return "Photo observations are limited, but reported symptoms can still guide safe checks.";
  const flags = new Set(symptoms);
  if (flags.has("whiteCoating")) return "Reported powdery coating: powdery mildew is one possibility, but dust or residue can look similar. Check both leaf surfaces before treatment.";
  if (flags.has("holes")) return "Reported feeding holes: inspect for chewing insects or snails before choosing any pest control.";
  if (flags.has("spots")) return "Reported leaf spots: could result from infection, sun scorch or physical damage. Look for spreading lesions across new leaves.";
  if (flags.has("wilting")) return "Reported wilting: first rule out underwatering and waterlogged roots; wilting alone cannot identify a disease.";
  if (flags.has("yellowing")) return "Reported yellowing: investigate watering, light and older leaves first; uneven yellow-green patterns may be normal variegation.";
  if (flags.has("curling")) return "Reported leaf curling: look for pests underneath leaves and sudden changes in light, heat or watering.";
  return "No specific symptoms confirmed. The photo screening checks quality and color patterns, not pathogens. Observe new growth over several days.";
}
