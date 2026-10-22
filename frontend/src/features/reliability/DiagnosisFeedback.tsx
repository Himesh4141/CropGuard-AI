import { useId, useState } from "react";
import type { Diagnosis } from "@/features/diagnosis/types";
const KEY = "cropguard:diagnosis-feedback:v1";
type Verdict = "yes" | "no" | "unsure";
interface RecordEntry { id: string; verdict: Verdict; note: string; createdAt: string; }
export function DiagnosisFeedback({diagnosis}: {diagnosis: Diagnosis}) {
  const noteId = useId();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const save = () => {
    if (!verdict) return;
    try {
      const old = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
      const list: RecordEntry[] = Array.isArray(old) ? old.filter((x): x is RecordEntry => Boolean(x) && typeof x === "object" && typeof x.id === "string").slice(-99) : [];
      list.push({id: diagnosis.id, verdict, note: note.slice(0, 400), createdAt: new Date().toISOString()});
      localStorage.setItem(KEY, JSON.stringify(list));
      setSaved(true);
    } catch { setSaved(false); }
  };
  return <section className="cg-feedback" aria-label="Diagnosis feedback">
    <h3>Was this suggestion useful?</h3>
    <p>Help improve your own records. Feedback is stored <strong>on this device only</strong>, not sent for training. No photo is stored or uploaded.</p>
    <div className="cg-choice-row" role="group" aria-label="Your assessment">
      {(["yes", "no", "unsure"] as const).map(v => <button type="button" aria-pressed={verdict===v} key={v} onClick={() => {setVerdict(v); setSaved(false);}}>{v === "yes" ? "Yes" : v === "no" ? "No" : "Not sure"}</button>)}
    </div>
    <label htmlFor={noteId}>Optional note about what you observed</label>
    <textarea id={noteId} value={note} maxLength={400} rows={2} onChange={e => setNote(e.target.value)} />
    <button type="button" className="button secondary" disabled={!verdict} onClick={save}>Save private feedback</button>
    {saved ? <p role="status">Feedback saved locally. You can delete it in CropGuard controls.</p> : null}
    <button type="button" className="button secondary" onClick={() => window.print()}>Print / save report as PDF</button>
  </section>;
}
