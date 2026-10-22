import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { screenText as tr, hasScreenTranslation } from "@/i18n/screenText";
import FlowerPhotoGallery from "./FlowerPhotoGallery";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCopy, Flower2, Search, ShieldAlert, Sprout } from "lucide-react";
import { FLOWER_CATALOG, FLOWER_CATEGORIES, findFlowerFromScientificName, getFlowerById, type FlowerCategory } from "./flowerGardenCatalog";
import "./flowerGarden.css";

type RecognitionCandidate = {
  scientific_name: string;
  common_name: string | null;
  confidence: number;
  flower_id: string | null;
};
type IdentityInfo = {
  flower_match?: string | null;
  candidates?: readonly RecognitionCandidate[];
  status: string;
  confidence: number;
  scientific_name?: string | null;
  common_name?: string | null;
};
type AssessmentInfo = {
  brightness?: string;
  sharpness?: string;
  signals?: readonly string[];
  observations?: readonly string[];
};
export type FlowerGardenPanelProps = {
  identity?: IdentityInfo | null;
  assessment?: AssessmentInfo | null;
  symptoms?: readonly string[];
  hasPhoto?: boolean;
};

const categoryNames: Record<FlowerCategory | "all", string> = { all: "All flowers", ...FLOWER_CATEGORIES };
const categories: readonly (FlowerCategory | "all")[] = ["all", "balcony", "indoor", "seasonal", "aquatic", "climber"];
type SavedFlowerPlan = { id: string; at: string; plant: string; text: string };
const FLOWER_HISTORY_KEY = "cropguard.flower.reports.v1";
function loadFlowerHistory(): SavedFlowerPlan[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(FLOWER_HISTORY_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is SavedFlowerPlan => Boolean(item) && typeof item.id === "string" && typeof item.at === "string" && typeof item.plant === "string" && typeof item.text === "string").slice(0, 10);
  } catch { return []; }
}

const TASK_LABELS = ["Check soil/water conditions before watering", "Check light and airflow", "Inspect both sides of leaves for pests", "Remove only dry/dead material", "Compare with a new photo next week"] as const;

function symptomCare(symptoms: readonly string[], risks: string, aquatic: boolean): string[] {
  const values = new Set(symptoms);
  const result: string[] = [];
  if (values.has("yellowing")) result.push(aquatic
    ? "Yellowing leaves: remove naturally aging submerged foliage; check water quality, light, and nutrient balance before treating."
    : "Yellowing: check whether the roots are staying wet, whether older leaves are aging naturally, and whether new leaves are pale. Do not diagnose nutrient deficiency from color alone.");
  if (values.has("wilting")) result.push(aquatic
    ? "Drooping aquatic foliage: confirm the water depth and crown placement, then examine for decay."
    : "Wilting: check moisture below the surface. Both drought and root rot can cause drooping; do not water until the cause is checked.");
  if (values.has("spots")) result.push("Leaf spots: look for expanding lesions, splashing water, heat scorch, and damage on several leaves; isolate spreading cases and increase airflow where suitable.");
  if (values.has("whiteCoating")) result.push("White coating: dust, mineral deposits and powdery mildew can look similar. Inspect the actual leaf surface and avoid spraying fungicide without a supported diagnosis.");
  if (values.has("holes")) result.push("Chewed edges or holes: inspect the leaf underside and nearby soil for caterpillars, snails or beetles. Remove visible pests by hand where safe.");
  if (values.has("curling")) result.push("Curling: check young leaf undersides for aphids or mites, and compare current heat, humidity and watering with previous conditions.");
  if (values.size) result.push(`Common concerns for this plant: ${risks}. These are possibilities to inspect, NOT diseases identified by this photo.`);
  else result.push(`Watch for ${risks.toLowerCase()}; routine inspection is more reliable than treating a plant with no confirmed symptoms.`);
  return result;
}

function readChecklist(plantId: string): boolean[] {
  try {
    const raw = window.localStorage.getItem(`cropguard.flower.tasks.v1.${plantId}`);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length === TASK_LABELS.length && parsed.every(x => typeof x === "boolean")) return parsed;
  } catch { /* private browsing or storage disabled */ }
  return TASK_LABELS.map(() => false);
}

export default function FlowerGardenPanel({ identity, assessment, symptoms = [], hasPhoto = false }: FlowerGardenPanelProps) {
  const lang = useCropGuardLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FlowerCategory | "all">("all");
  const [selectedId, setSelectedId] = useState("rose");
  const [tasks, setTasks] = useState<boolean[]>(() => readChecklist("rose"));
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedFlowerPlan[]>(loadFlowerHistory);
  const [saveFeedback, setSaveFeedback] = useState("");
  const selected = getFlowerById(selectedId) ?? FLOWER_CATALOG[0]!;
  const credibleMatch = identity?.status === "identified" && Number.isFinite(identity.confidence) && identity.confidence >= 0.70
    ? findFlowerFromScientificName(identity.scientific_name) : null;
  const uncertainMatch = !credibleMatch && identity && identity.status !== "unknown"
    ? findFlowerFromScientificName(identity.scientific_name) : null;
  // The provider supplies alternatives; tapping one opens a care guide manually.
  // It must never imply a verified species determination or disease diagnosis.
  const candidateFlowers = (identity?.candidates ?? []).flatMap((candidate, index) => {
    const flower = candidate.flower_id ? getFlowerById(candidate.flower_id) : findFlowerFromScientificName(candidate.scientific_name);
    if (!flower || !Number.isFinite(candidate.confidence)) return [];
    return [{ key: `${flower.id}-${index}`, flower, confidence: Math.max(0, Math.min(1, candidate.confidence)) }];
  });
  const shortlisted = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return FLOWER_CATALOG.filter(plant =>
      (category === "all" || plant.category === category) &&
      (!q || [plant.name, ...plant.scientificNames].join(" ").toLocaleLowerCase().includes(q))
    );
  }, [search, category]);
  const guidance = symptomCare(symptoms, selected.commonRisks, selected.category === "aquatic");

  useEffect(() => {
    setTasks(readChecklist(selected.id));
    setCopied(false);
    setShowExport(false);
    setSaveFeedback("");
  }, [selected.id]);

  function toggleTask(index: number) {
    const next = tasks.map((done, position) => position === index ? !done : done);
    setTasks(next);
    try { window.localStorage.setItem(`cropguard.flower.tasks.v1.${selected.id}`, JSON.stringify(next)); }
    catch { /* care advice still works offline */ }
  }

  const reportText = [
    `CropGuard Home Planters — ${selected.name}`,
    `Care selection: ${selected.scientificNames[0]} (not necessarily photo-verified)`,
    `Photo result: ${identity ? `${identity.status}; provider score ${Math.round(identity.confidence * 100)}%` : "No automatic identity available"}`,
    `User-observed symptoms: ${symptoms.length ? symptoms.join(", ") : "none"}`,
    "",
    `Light: ${tr(selected.light, lang)}`,
    `Water: ${tr(selected.watering, lang)}`,
    `Soil: ${tr(selected.soil, lang)}`,
    `Fertilizer: ${tr(selected.feeding, lang)}`,
    `Pruning: ${tr(selected.pruning, lang)}`,
    `Bloom season: ${tr(selected.blooming, lang)}`,
    `Propagation: ${tr(selected.propagation, lang)}`,
    `Pests and common concerns: ${tr(selected.commonRisks, lang)}`,
    `Pet/child safety: ${tr(selected.petSafety, lang)}`,
    `Local care note: ${tr(selected.tip, lang)}`,
    "",
    ...guidance.map(note => `- ${note}`),
    "",
    "Photo screening is not a disease diagnosis. Seek a local horticulture expert for spreading damage or chemical treatment advice.",
  ].join("\n");

  function saveCarePlan() {
    const record: SavedFlowerPlan = { id: `${Date.now()}-${selected.id}`, at: new Date().toISOString(), plant: selected.name, text: reportText };
    const next = [record, ...savedPlans].slice(0, 10);
    try {
      window.localStorage.setItem(FLOWER_HISTORY_KEY, JSON.stringify(next));
      setSavedPlans(next);
      setSaveFeedback("Care plan saved on this device without your photo.");
    } catch {
      setSaveFeedback("Device storage is unavailable. Use Copy full care guide instead.");
    }
  }

  async function copyReport() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setShowExport(false);
    } catch {
      setShowExport(true);
      setCopied(false);
    }
  }

  return (
    <section className="hp-panel fg-panel" aria-labelledby="fg-title">
      <div className="fg-heading">
        <div>
          <span className="eyebrow">CROPGUARD · FLOWER CARE</span>
          <h2 id="fg-title"><Flower2 size={24} aria-hidden="true" /> Explore {FLOWER_CATALOG.length} flowering plants</h2>
          <p>Find a rose, jasmine, hibiscus, marigold, orchid and many more. Choose a plant for a complete care guide, or use a suggested flower after photo analysis.</p>
        </div>
        <span className="fg-count">{FLOWER_CATALOG.length} guides</span>
      </div>

      {credibleMatch && <div className="fg-identity" role="status">
        <CheckCircle2 size={20} aria-hidden="true" />
        <div><strong>Possible photo match: {credibleMatch.name}</strong><span>Plant-identification provider score {Math.round((identity?.confidence ?? 0) * 100)}%. This is a suggestion, not botanical proof.</span></div>
        <button type="button" className="button secondary" onClick={() => setSelectedId(credibleMatch.id)}>See its care guide</button>
      </div>}
      {uncertainMatch && <p className="fg-caution">Possible match: {uncertainMatch.name}. The photo score is not strong enough to assign an identity. Select it manually only if you recognize the plant.</p>}
      {hasPhoto && !identity && <p className="fg-caution">Run the photo analysis above for an identification suggestion. You can still browse all care guides without a photo or network connection.</p>}
      {assessment && <p className="fg-photo-context">Photo screening: {assessment.brightness ?? "unknown"} lighting · {assessment.sharpness ?? "unknown"} detail. Color patterns and image quality cannot identify pathogens.</p>}

      {candidateFlowers.length > 0 && <div className="fg-candidates" role="region" aria-label="Additional photo identification suggestions">
        <strong>Photo identification suggestions</strong>
        <p>These are Pl@ntNet search candidates, not independently verified plant identities. Select a guide only after comparing your actual plant.</p>
        <div className="fg-candidate-list">{candidateFlowers.map(({key, flower, confidence}) => <button key={key} className="fg-candidate" type="button" onClick={() => setSelectedId(flower.id)}>
          <span>{flower.name}</span><small>{Math.round(confidence * 100)}% provider score · open care guide</small>
        </button>)}</div>
      </div>}
      <div className="fg-toolbar">
        <label className="fg-search"><Search size={18} aria-hidden="true" /><span className="fg-visually-hidden">Search flowers</span><input type="search" placeholder="Search rose, jasmine, orchid..." value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className="fg-filter"><span className="fg-visually-hidden">Filter flower category</span><select value={category} onChange={event => setCategory(event.target.value as FlowerCategory | "all")}>{categories.map(item => <option key={item} value={item}>{categoryNames[item]}</option>)}</select></label>
      </div>
      <div className="fg-species-list" aria-label="Flower species catalogue">
        {shortlisted.map(plant => <button key={plant.id} type="button" aria-pressed={selected.id === plant.id} className={`fg-species${selected.id === plant.id ? " is-selected" : ""}`} onClick={() => setSelectedId(plant.id)}><Flower2 size={17} aria-hidden="true" /><span>{plant.name}</span></button>)}
        {shortlisted.length === 0 && <p className="fg-empty">No matching flower. Try another name or select All flowers.</p>}
      </div>

      <article className="fg-care-card" aria-labelledby="fg-guide-title">
        <div className="fg-care-title"><div><span className="eyebrow">SELECTED CARE GUIDE · NOT PHOTO-CONFIRMED</span><h3 id="fg-guide-title">{selected.name}</h3><i>{selected.scientificNames[0]}</i></div><span className="fg-type">{FLOWER_CATEGORIES[selected.category]}</span></div>
        {lang !== "en" && !hasScreenTranslation(selected.watering, lang) && (
          <p className="fg-caution" role="note">{tr("Care guide originally written in English. Please confirm safety-critical advice with a local horticulture expert.", lang)}</p>
        )}
        <FlowerPhotoGallery plant={selected} />
        <div className="fg-care-grid">
          <div><h4>☀️ {tr("Light", lang)}</h4><p>{tr(selected.light, lang)}</p></div>
          <div><h4>💧 {tr("Watering", lang)}</h4><p>{tr(selected.watering, lang)}</p></div>
          <div><h4>🪴 {tr("Potting mix", lang)}</h4><p>{tr(selected.soil, lang)}</p></div>
          <div><h4>🌱 {tr("Feeding", lang)}</h4><p>{tr(selected.feeding, lang)}</p></div>
          <div><h4>✂️ {tr("Pruning", lang)}</h4><p>{tr(selected.pruning, lang)}</p></div>
          <div><h4>🌸 {tr("Blooming", lang)}</h4><p>{tr(selected.blooming, lang)}</p></div>
          <div><h4>🦋 {tr("Propagation", lang)}</h4><p>{tr(selected.propagation, lang)}</p></div>
          <div><h4>🐛 {tr("Common concerns", lang)}</h4><p>{tr(selected.commonRisks, lang)}</p></div>
          <div className="fg-care-warning"><h4>⚠️ {tr("Children & pets", lang)}</h4><p>{tr(selected.petSafety, lang)}</p></div>
          <div><h4>📍 {tr("Practical tip", lang)}</h4><p>{tr(selected.tip, lang)}</p></div>
        </div>
        <div className="fg-symptoms"><h4><Sprout size={18} aria-hidden="true" /> {tr("Plant-health follow-up", lang)}</h4><p className="fg-muted">Based on symptoms you ticked in the photo section. These are safe checks, not an automatic disease diagnosis.</p><ul>{guidance.map(note => <li key={note}>{note}</li>)}</ul></div>
        <div className="fg-task-panel"><h4>{tr("Care checklist", lang)} <span>{tasks.filter(Boolean).length}/{TASK_LABELS.length}</span></h4><div className="fg-task-grid">{TASK_LABELS.map((name, i) => <label key={name}><input type="checkbox" checked={tasks[i] ?? false} onChange={() => toggleTask(i)} /><span>{name}</span></label>)}</div><p className="fg-muted">Checklist is saved on this device per flower. Water only after checking your plant, not according to a fixed timer.</p></div>
        <div className="fg-footer"><button type="button" className="button secondary" onClick={saveCarePlan}><CheckCircle2 size={17} aria-hidden="true" /> Save flower care report</button><button type="button" className="button secondary" onClick={() => void copyReport()}><ClipboardCopy size={17} aria-hidden="true" /> {copied ? "Care guide copied" : "Copy full care guide"}</button></div>
        {saveFeedback && <p className="fg-muted" role="status">{saveFeedback}</p>}
        {savedPlans.length > 0 && <details className="fg-history"><summary>Saved flower care reports ({savedPlans.length})</summary><div>{savedPlans.map(item => <details key={item.id}><summary>{item.plant} · {new Date(item.at).toLocaleString()}</summary><pre>{item.text}</pre></details>)}</div><button type="button" className="button secondary" onClick={() => { if (window.confirm("Delete saved flower care reports from this device?")) { try { window.localStorage.removeItem(FLOWER_HISTORY_KEY); } catch { /* ignore */ } setSavedPlans([]); setSaveFeedback("Saved flower reports cleared."); } }}>Clear saved flower reports</button></details>}
        {showExport && <label className="fg-export">Clipboard unavailable? Select and copy the care report below.<textarea readOnly rows={7} value={reportText} onFocus={e => e.currentTarget.select()} /></label>}
        <p className="fg-disclaimer"><ShieldAlert size={18} aria-hidden="true" /> Identification suggestions can be wrong; this catalogue is educational care support, not evidence that your photo has a particular species, pest or disease. Do not choose pesticides or fungicides from color analysis alone.</p>
      </article>
    </section>
  );
}
