import type { Diagnosis } from "./types";

/** Conservative follow-up actions for an ML screening; no pesticide recommendations. */
export function buildCropCareSteps(diagnosis: Diagnosis): string[] {
  const label = (diagnosis.predicted_label || "").toLowerCase().replaceAll("_", " ");
  const uncertain = diagnosis.is_uncertain || diagnosis.status !== "analyzed" ||
    diagnosis.inference_mode !== "onnx_model" || diagnosis.confidence === null ||
    diagnosis.confidence < 0.7 || /(unsupported|mismatch|quality|coverage)/.test(label);
  if (uncertain) return [
    "Retake two clear photos in daylight: the entire affected plant and a sharp close-up of both sides of a leaf.",
    "Check whether the pattern occurs on several plants or only one, and compare with healthy plants of the same crop.",
    "Request an agronomist or extension officer review before starting disease-specific treatment. Keep monitoring and record changes.",
  ];
  const care: string[] = [];
  if (/healthy/.test(label)) {
    care.push("No model-supported disease pattern was identified in this image. Check new growth every few days; one healthy-looking photo cannot rule out early infection.");
  } else if (/late blight|early blight|blight/.test(label)) {
    care.push("A blight-like pattern was flagged. Examine nearby plants for rapidly expanding brown patches, especially after wet conditions, and record how quickly they spread.");
    care.push("Avoid overhead irrigation where practical, improve airflow, and remove fallen infected-looking debris with clean tools. Seek local crop-specific advice promptly if damage spreads.");
  } else if (/powdery mildew|downy mildew|mildew/.test(label)) {
    care.push("A mildew-like pattern was flagged. Examine both leaf surfaces for coating or angular discoloration; inspect nearby leaves before assuming the cause.");
    care.push("Improve spacing and airflow; avoid wet foliage late in the day. Ask a local agronomist to confirm whether any treatment is needed.");
  } else if (/rust/.test(label)) {
    care.push("A rust-like pattern was flagged. Look for orange-brown raised pustules on the undersides of multiple leaves; avoid handling wet leaves between plants.");
    care.push("Track affected leaves and field distribution. Ask for local confirmation before using a fungicide.");
  } else if (/bacterial|spot|scab|septoria|cercospora/.test(label)) {
    care.push("A leaf-spot pattern was flagged. Photograph new lesions and examine whether spots are growing or showing halos; nutrient stress and physical damage can look similar.");
    care.push("Avoid splashing water from affected foliage to healthy plants, clean tools, and ask a local expert to distinguish bacterial from fungal or noninfectious causes.");
  } else if (/mosaic|virus|curl|yellow leaf/.test(label)) {
    care.push("A virus-like leaf distortion or mottling pattern was flagged. Check new shoots and leaf undersides for aphids, whiteflies or other vectors.");
    care.push("Separate visibly affected plants when practical and seek local confirmation before removing plants; pesticides do not cure viral infections.");
  } else if (/wilt/.test(label)) {
    care.push("Wilting can result from drought, waterlogging, vascular disease, or heat. Check root-zone moisture and inspect the stem before assuming an infection.");
  } else {
    care.push("The image suggests a crop-health pattern. Compare affected and unaffected plants, inspect both leaf surfaces, and document new symptoms before choosing a treatment.");
  }
  care.push("Record the number of affected plants and reassess after 48–72 hours; escalating damage or high crop value warrants an extension officer visit.");
  care.push("This is a model-assisted screening, not a confirmed laboratory diagnosis. Follow locally approved agronomy advice and label instructions before applying any crop protection product.");
  return care;
}
