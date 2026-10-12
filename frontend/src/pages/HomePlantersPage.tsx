import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CheckCircle2, Flower2, ImagePlus, Leaf, ScanSearch, ShieldAlert, Trash2, History, Save } from "lucide-react";
import { buildCareGuide, possibleCareConcern, plantNames, symptomLabels, type PlantChoice, type Symptom } from "@/features/homePlanters/careGuide";
import { screenPhoto, type ImageAssessment } from "@/features/homePlanters/imageAssessment";
import { identifyPlant, type PlantIdentity } from "@/features/homePlanters/plantIdentity";
import { loadPreferences } from "@/features/profile/localPreferences";
import { useAuthStore } from "@/features/auth/store";
import { clearScans, loadScans, saveScan, type CareReport, type ScanRecord } from "@/features/homePlanters/localHistory";
import "@/features/homePlanters/homePlanters.css";

const allSymptoms = Object.keys(symptomLabels) as Symptom[];
const maxBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function HomePlantersPage() {
  const isAndroid = Capacitor.getPlatform() === "android";
  const userId = useAuthStore(state => state.user?.id);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const cameraRequest = useRef(0);
  const scanSequence = useRef(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [plant, setPlant] = useState<PlantChoice>("unknown");
  const [identity, setIdentity] = useState<PlantIdentity | null>(null);
  const [identityMessage, setIdentityMessage] = useState("");
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [assessment, setAssessment] = useState<ImageAssessment | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>(() => loadScans());
  const [savedId, setSavedId] = useState<string | null>(null);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function receivePhoto(next?: File) {
    if (!next) return;
    cameraRequest.current++;
    scanSequence.current++;
    setError(null);
    setAssessment(null);
    setPlant("unknown");
    setIdentity(null);
    setIdentityMessage("");
    setSavedId(null);
    setScanning(false);
    setPhoto(null);
    if (!allowedTypes.has(next.type)) { setError("Choose a JPG, PNG or WebP photograph."); return; }
    if (!next.size || next.size > maxBytes) { setError("Photo must be under 10 MB and not empty."); return; }
    setPhoto(next);
  }

  function clearPhoto() {
    cameraRequest.current++;
    scanSequence.current++;
    setPhoto(null);
    setAssessment(null);
    setPlant("unknown");
    setIdentity(null);
    setIdentityMessage("");
    setScanning(false);
    setError(null);
    setSavedId(null);
    if (uploadRef.current) uploadRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function captureNativePhoto() {
    if (!isAndroid || !Capacitor.isPluginAvailable("Camera")) {
      cameraRef.current?.click();
      return;
    }

    const request = ++cameraRequest.current;
    setError(null);
    try {
      const { Camera: NativeCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const captured = await NativeCamera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 78,
        width: 1600,
        height: 1600,
        correctOrientation: true,
        saveToGallery: false,
      });
      if (!captured.webPath) throw new Error("The camera did not return a readable photograph.");
      const response = await fetch(captured.webPath);
      if (!response.ok) throw new Error("The captured photograph could not be opened.");
      const bytes = await response.blob();
      if (request !== cameraRequest.current) return; // User selected/cleared another photo.
      const mime = captured.format === "png" ? "image/png" : "image/jpeg";
      const extension = mime === "image/png" ? "png" : "jpg";
      receivePhoto(new File([bytes], `home-plant-${Date.now()}.${extension}`, { type: mime }));
    } catch (cause) {
      if (request !== cameraRequest.current) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      if (/cancelled|canceled|cancel|dismissed|dismiss/i.test(message)) return;
      setError("Camera photo could not be loaded. Try Upload image or the device camera again.");
    }
  }

  function toggleSymptom(value: Symptom) {
    setSymptoms(old => old.includes(value) ? old.filter(item => item !== value) : [...old, value]);
    setSavedId(null);
  }

  async function analyzePhoto() {
    if (!photo || scanning) return;
    const id = ++scanSequence.current;
    setError(null);
    setAssessment(null);
    setScanning(true);
    setSavedId(null);
    try {
      // Analyze colors locally; species ID is an independent remote workflow.
      // Promise.allSettled keeps care guidance available if recognition is offline.
      const [visual, identification] = await Promise.allSettled([screenPhoto(photo), identifyPlant(photo)]);
      if (scanSequence.current !== id) return;
      if (visual.status === "rejected") throw visual.reason;
      setAssessment(visual.value);
      const found = identification.status === "fulfilled" ? identification.value : null;
      const foundPlant: PlantChoice = found?.status === "identified" ? found.plant : "unknown";
      if (userId && loadPreferences(userId).autoSaveScans) {
        const record = createRecord(foundPlant, found, visual.value, symptoms);
        setHistory(saveScan(record));
        setSavedId(record.id);
      }
      if (identification.status === "fulfilled") {
        setIdentity(identification.value);
        setPlant(identification.value.status === "identified" ? identification.value.plant : "unknown");
        setIdentityMessage(identification.value.message);
      } else {
        setIdentity(null);
        setPlant("unknown");
        setIdentityMessage("Automatic plant identification is temporarily unavailable. The photo was still screened for visible concerns. Recognition requires the backend PlantNet service to be configured.");
      }
    } catch (failure) {
      if (scanSequence.current === id) {
        setError(failure instanceof Error ? failure.message : "The photograph could not be processed. Please retry.");
      }
    } finally {
      if (scanSequence.current === id) setScanning(false);
    }
  }

  function createRecord(currentPlant: PlantChoice, currentIdentity: PlantIdentity | null, currentAssessment: ImageAssessment, currentSymptoms: Symptom[]): ScanRecord {
    const report: CareReport = {
      identity: currentIdentity ? {
        status: currentIdentity.status, confidence: currentIdentity.confidence,
        scientific_name: currentIdentity.scientific_name, common_name: currentIdentity.common_name,
      } : null,
      photoQuality: `${currentAssessment.brightness} lighting · ${currentAssessment.sharpness} detail`,
      observations: [possibleCareConcern(currentSymptoms, currentAssessment), ...currentAssessment.observations, ...currentAssessment.retakeReasons],
      recommendations: buildCareGuide(currentPlant, currentSymptoms, currentAssessment),
    };
    return {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: new Date().toISOString(), plant: currentPlant,
      symptoms: [...currentSymptoms], signals: [...currentAssessment.signals],
      usable: currentAssessment.usable, report,
    };
  }

  function saveObservation() {
    if (!assessment || savedId) return;
    const record = createRecord(plant, identity, assessment, symptoms);
    setHistory(saveScan(record));
    setSavedId(record.id);
    setOpenReportId(record.id);
  }

  function deleteHistory() {
    if (!window.confirm("Delete all saved Home Planters care reports from this device?")) return;
    clearScans();
    setHistory([]);
    setSavedId(null);
    setOpenReportId(null);
  }

  const advice = assessment ? buildCareGuide(plant, symptoms, assessment) : [];
  return (
    <div className="page hp-page">
      <div className="hp-head">
        <span className="eyebrow">CROPGUARD · HOME PLANTERS</span>
        <h1><Flower2 size={30} aria-hidden="true" /> Healthy home plants start with a clearer picture.</h1>
        <p>Take or upload a photo to screen visible foliage patterns and receive practical care guidance. No farm or field is required.</p>
      </div>
      <div className="hp-grid">
        <section className="hp-panel" aria-labelledby="hp-photo-title">
          <div className="hp-section-title"><ImagePlus size={20} aria-hidden="true" /><h2 id="hp-photo-title">1. Photograph your plant</h2></div>
          <div className="hp-photo">
            {preview ? <img src={preview} alt="Selected home plant photograph" /> : <div className="hp-empty"><Leaf size={37} aria-hidden="true" /><span>Take or upload a clear plant photo</span><small>Show a leaf and its surroundings in natural daylight.</small></div>}
          </div>
          <div className="hp-actions">
            {isAndroid && <button type="button" className="button primary" onClick={() => void captureNativePhoto()}><Camera size={18} /> Take photo</button>}
            <button type="button" className="button secondary" onClick={() => uploadRef.current?.click()}><ImagePlus size={18} /> Upload image</button>
            {photo && <button type="button" className="button secondary" onClick={clearPhoto} aria-label="Remove photograph"><Trash2 size={18} /></button>}
          </div>
          <input ref={uploadRef} type="file" className="hp-hidden" accept="image/jpeg,image/png,image/webp" aria-label="Upload a plant photo" onChange={event => { receivePhoto(event.target.files?.[0]); event.target.value = ""; }} />
          {isAndroid && <input ref={cameraRef} type="file" className="hp-hidden" capture="environment" accept="image/*" aria-label="Take a plant photo" onChange={event => { receivePhoto(event.target.files?.[0]); event.target.value = ""; }} />}
          <button className="button primary hp-scan-button" type="button" disabled={!photo || scanning} onClick={() => void analyzePhoto()}><ScanSearch size={19} /> {scanning ? "Analyzing photo…" : "Analyze photo and get care guidance"}</button>
          {error && <p className="hp-error" role="alert">{error}</p>}
          <p className="hp-privacy">Visual screening stays on this device. For automatic species recognition, the photograph is sent through the CropGuard API to Pl@ntNet when the service is configured. No farmer field is required.</p>
        </section>

        <section className="hp-panel" aria-labelledby="hp-identity-title">
          <div className="hp-section-title"><Leaf size={20} aria-hidden="true" /><h2 id="hp-identity-title">2. Automatic plant recognition</h2></div>
          <p className="hp-muted">Upload or photograph a plant, then tap Analyze. CropGuard requests an identification from the Pl@ntNet plant recognition service. No manual plant selection or farm is required.</p>
          <div className="hp-identity-result" role="status">
            <strong>{identity?.status === "identified"
              ? (identity.plant === "unknown" ? (identity.common_name || identity.scientific_name || "Plant match") : plantNames[identity.plant])
              : identity?.status === "uncertain"
                ? `Possible match: ${identity.common_name || identity.scientific_name || "unconfirmed plant"}`
                : identity?.status === "unknown" ? "Plant identity not confirmed" : "Awaiting a confident identification"}</strong>
            {identity?.scientific_name && <span>{identity.status === "identified" ? "Provider scientific name" : "Possible scientific name"}: <i>{identity.scientific_name}</i></span>}
            {identity && <span>Pl@ntNet score: {Math.round(identity.confidence * 100)}% · {identity.status === "identified" ? "strong suggestion" : identity.status === "uncertain" ? "uncertain suggestion" : "inconclusive"}</span>}
            {identityMessage && <p>{identityMessage}</p>}
          </div>
          <div className="hp-section-title hp-section-space"><ShieldAlert size={20} aria-hidden="true" /><h2>3. Add observations (optional)</h2></div>
          <p className="hp-muted">Tell CropGuard what you see on the real leaves. This helps distinguish visible symptoms from photo backgrounds.</p>
          <div className="hp-symptoms">{allSymptoms.map(value => <label className="hp-check" key={value}><input type="checkbox" checked={symptoms.includes(value)} onChange={() => toggleSymptom(value)} /><span>{symptomLabels[value]}</span></label>)}</div>
        </section>
      </div>

      <section className="hp-panel hp-result" aria-live="polite">
        <div className="hp-section-title"><ScanSearch size={21} aria-hidden="true" /><h2>Photo analysis and care guidance</h2></div>
        {!assessment ? <p className="hp-muted">Add a photo and tap Analyze to see photo-quality findings, vegetation-adjacent color patterns, and plant-specific care instructions.</p> : <div className="hp-report">
          <div className="hp-report-heading"><span className={assessment.usable ? "hp-status hp-status-ok" : "hp-status hp-status-warn"}>{assessment.usable ? "Photo screened" : "Retake recommended"}</span><span className="hp-report-caption">Visual observations · no pathogen diagnosis</span></div>
          <p><strong>Plant:</strong> {identity?.status === "identified" && identity.plant === "unknown" ? (identity.common_name || identity.scientific_name || "Plant match") : plantNames[plant]} <span className="hp-report-caption">({identity?.status === "identified" ? "automatic provider suggestion" : identity?.status === "uncertain" ? "possible species match, not confirmed" : "not identified"})</span></p>
          {identity?.status === "uncertain" && <p className="hp-confidence-note">Possible match: {identity.common_name || identity.scientific_name || "unknown plant"} ({Math.round(identity.confidence * 100)}% provider score). Care advice below remains general until the species is more certain.</p>}
          <p><strong>Photo quality:</strong> {assessment.brightness} lighting · {assessment.sharpness} detail</p>
          <p><strong>Notes from you:</strong> {symptoms.length ? symptoms.map(key => symptomLabels[key]).join(", ") : "None"}</p>
          <h3>Care assessment</h3>
          <p>{possibleCareConcern(symptoms, assessment)}</p>
          <h3>What the image shows</h3>
          <ul>{assessment.observations.map(line => <li key={line}>{line}</li>)}{assessment.retakeReasons.map(line => <li key={line}>{line}</li>)}</ul>
          <h3>Recommended care and follow-up</h3>
          <ol>{advice.map(line => <li key={line}>{line}</li>)}</ol>
          <div className="hp-button-row"><button type="button" className="button secondary" onClick={saveObservation} disabled={Boolean(savedId)}>{savedId ? <CheckCircle2 size={18} /> : <Save size={18} />}{savedId ? " Saved to this device" : " Save care report"}</button></div>
          <p className="hp-disclaimer"><ShieldAlert size={18} aria-hidden="true" /><span><strong>Interpretation:</strong> Pl@ntNet predictions can be wrong. A camera photo cannot reliably prove the cause of damage, disease type, or whether a plant is healthy. Color signals may come from the background. Avoid pesticide treatments without a supported diagnosis.</span></p>
        </div>}
      </section>

      <section className="hp-panel hp-history" aria-labelledby="hp-history-title">
        <div className="hp-history-header"><div className="hp-section-title"><History size={20} aria-hidden="true" /><h2 id="hp-history-title">Care report history</h2></div>{history.length > 0 && <button type="button" className="button secondary" onClick={deleteHistory}><Trash2 size={16} /> Delete history</button>}</div>
        <p className="hp-privacy">Your last 30 saved reports stay on this device and can be reopened. Photos, credentials, and farm or field details are never saved in this history.</p>
        {!history.length ? <p className="hp-muted">No saved Home Planters reports yet. Analyze a photo and choose Save report, or enable automatic saving in Profile.</p> :
          <div className="hp-history-list">{history.map(record =>
            <article className="hp-history-record" key={record.id}>
              <button className="hp-history-open" type="button" aria-expanded={openReportId === record.id} aria-label={`Open care report for ${plantNames[record.plant]} on ${new Date(record.date).toLocaleDateString()}`} onClick={() => setOpenReportId(openReportId === record.id ? null : record.id)}>
                <span><strong>{record.report?.identity?.common_name || plantNames[record.plant]}</strong><small>{new Date(record.date).toLocaleString()}</small></span>
                <span>{record.report ? "View report" : "Older summary"} {openReportId === record.id ? "−" : "+"}</span>
              </button>
              {openReportId === record.id && <div className="hp-history-details">
                <p><strong>Identification:</strong> {record.report?.identity ? `${record.report.identity.common_name || plantNames[record.plant]} (${Math.round(record.report.identity.confidence * 100)}% score; ${record.report.identity.status})` : plantNames[record.plant]}</p>
                {record.report?.identity?.scientific_name && <p><strong>Scientific name:</strong> <i>{record.report.identity.scientific_name}</i></p>}
                <p><strong>Reported symptoms:</strong> {record.symptoms.length ? record.symptoms.map(x => symptomLabels[x]).join(", ") : "None"}</p>
                {record.report ? <>
                  <p><strong>Photo quality:</strong> {record.report.photoQuality}</p>
                  <h3>Photo observations</h3>
                  <ul>{record.report.observations.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  <h3>Care recommendations</h3>
                  <ol>{record.report.recommendations.map((item, i) => <li key={i}>{item}</li>)}</ol>
                </> : <p>Saved by an earlier version. The original care recommendations were not stored in that version.</p>}
              </div>}
            </article>
          )}</div>}
      </section>
    </div>
  );
}
