/** Separate on-device Home Planters history. NO image bytes and NO field/farm IDs. */
import type { PlantChoice, Symptom } from "./careGuide";
import type { ImageAssessment } from "./imageAssessment";

export type ScanRecord = {
  id: string;
  date: string;
  plant: PlantChoice;
  symptoms: Symptom[];
  signals: ImageAssessment["signals"];
  usable: boolean;
};

const KEY = "cropguard-home-planters-scans-v1";
const LIMIT = 30;
const plants: PlantChoice[] = ["tulsi", "pothos", "unknown"];
const symptomKeys: Symptom[] = ["spots", "yellowing", "whiteCoating", "holes", "wilting", "curling"];
const signalKeys: ImageAssessment["signals"] = ["yellow_tones", "brown_tones", "pale_tones"];

export function loadScans(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is ScanRecord => {
      if (!entry || typeof entry !== "object") return false;
      const r = entry as Partial<ScanRecord>;
      return typeof r.id === "string" && r.id.length < 100 &&
        typeof r.date === "string" && Number.isFinite(Date.parse(r.date)) &&
        plants.includes(r.plant as PlantChoice) && typeof r.usable === "boolean" &&
        Array.isArray(r.symptoms) && r.symptoms.every(s => symptomKeys.includes(s)) &&
        Array.isArray(r.signals) && r.signals.every(s => signalKeys.includes(s));
    }).slice(0, LIMIT);
  } catch {
    // Private mode, disabled storage, or older incompatible data.
    return [];
  }
}

export function saveScan(record: ScanRecord): ScanRecord[] {
  const updated = [record, ...loadScans()].slice(0, LIMIT);
  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* privacy mode or storage full */ }
  return updated;
}

export function clearScans(): void {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}
