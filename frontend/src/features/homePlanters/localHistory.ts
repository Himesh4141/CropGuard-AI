/** Private, device-local Home Planters reports. Never persist photos, farm IDs, or credentials. */
import type { PlantChoice, Symptom } from "./careGuide";
import type { ImageAssessment } from "./imageAssessment";
import type { PlantIdentity } from "./plantIdentity";

export type CareReport = {
  identity: Pick<PlantIdentity, "status" | "confidence" | "scientific_name" | "common_name"> | null;
  photoQuality: string;
  observations: string[];
  recommendations: string[];
};
export type ScanRecord = {
  id: string;
  date: string;
  plant: PlantChoice;
  symptoms: Symptom[];
  signals: ImageAssessment["signals"];
  usable: boolean;
  report?: CareReport; // Older summary-only records remain readable.
};

const KEY = "cropguard-home-planters-scans-v1";
const LIMIT = 30;
const plants: PlantChoice[] = ["tulsi", "pothos", "unknown"];
const symptomKeys: Symptom[] = ["spots", "yellowing", "whiteCoating", "holes", "wilting", "curling"];
const signalKeys: ImageAssessment["signals"] = ["yellow_tones", "brown_tones", "pale_tones"];
const safeText = (v: unknown, n = 700): v is string => typeof v === "string" && v.length <= n;
const textList = (v: unknown, limit = 20) => Array.isArray(v) && v.length <= limit && v.every(x => safeText(x));
function validReport(v: unknown): v is CareReport {
  if (!v || typeof v !== "object") return false;
  const r = v as Partial<CareReport>;
  if (!safeText(r.photoQuality, 200) || !textList(r.observations) || !textList(r.recommendations)) return false;
  if (r.identity === null) return true;
  const id = r.identity;
  return !!id && ["identified", "uncertain", "unknown"].includes(id.status) &&
    typeof id.confidence === "number" && Number.isFinite(id.confidence) && id.confidence >= 0 && id.confidence <= 1 &&
    (id.scientific_name === null || safeText(id.scientific_name, 200)) &&
    (id.common_name === null || safeText(id.common_name, 200));
}
export function loadScans(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > 180_000) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is ScanRecord => {
      if (!entry || typeof entry !== "object") return false;
      const r = entry as Partial<ScanRecord>;
      return typeof r.id === "string" && r.id.length < 100 &&
        typeof r.date === "string" && Number.isFinite(Date.parse(r.date)) &&
        plants.includes(r.plant as PlantChoice) && typeof r.usable === "boolean" &&
        Array.isArray(r.symptoms) && r.symptoms.every(s => symptomKeys.includes(s)) &&
        Array.isArray(r.signals) && r.signals.every(s => signalKeys.includes(s)) &&
        (r.report === undefined || validReport(r.report));
    }).slice(0, LIMIT);
  } catch { return []; }
}
export function saveScan(record: ScanRecord): ScanRecord[] {
  const updated = [record, ...loadScans()].slice(0, LIMIT);
  try { localStorage.setItem(KEY, JSON.stringify(updated)); }
  catch { throw new Error("Care report could not be saved. Device storage is unavailable or full."); }
  return updated;
}
export function clearScans(): void {
  try { localStorage.removeItem(KEY); }
  catch { throw new Error("Care report history could not be deleted. Device storage is unavailable."); }
}
