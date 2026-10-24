import { useEffect, useState } from "react";
import { Languages, Moon, Sun, Wifi, WifiOff, RefreshCw, Volume2, Trash2, ShieldCheck } from "lucide-react";
import { warmBackend } from "@/services/backendWarmup";
import "@/styles/cropguard-premium.css";

type Locale = "en" | "hi" | "te";
type State = "checking" | "online" | "offline" | "waking";
type Theme = "light" | "dark";
const WORDS: Record<Locale, {status: string; online: string; waking: string; offline: string; retry: string; privacy: string; note: string}> = {
  en: { status: "Server", online: "Connected", waking: "Waking up server", offline: "Unavailable — try again", retry: "Retry connection", privacy: "Delete device feedback", note: "AI screening is not a confirmed diagnosis." },
  hi: { status: "सर्वर", online: "कनेक्टेड", waking: "सर्वर शुरू हो रहा है", offline: "अभी उपलब्ध नहीं", retry: "फिर प्रयास करें", privacy: "डिवाइस की प्रतिक्रिया मिटाएं", note: "AI जाँच पक्की बीमारी की पहचान नहीं है।" },
  te: { status: "సర్వర్", online: "కనెక్ట్ అయింది", waking: "సర్వర్ ప్రారంభమవుతోంది", offline: "ప్రస్తుతం అందుబాటులో లేదు", retry: "మళ్లీ ప్రయత్నించండి", privacy: "పరికర ఫీడ్‌బ్యాక్ తొలగించు", note: "AI పరిశీలన ఖచ్చితమైన వ్యాధి నిర్ధారణ కాదు." },
};
const KEY_THEME = "cropguard:ui-theme";
const KEY_LOCALE = "cropguard:language";
function safeRead(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function safeWrite(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* private browsing storage disabled */ } }

export function TrustCentre() {
  const [theme, setTheme] = useState<Theme>(() => safeRead(KEY_THEME) === "dark" ? "dark" : "light");
  const [locale, setLocale] = useState<Locale>(() => { const v = safeRead(KEY_LOCALE); return v === "hi" || v === "te" ? v : "en"; });
  const [state, setState] = useState<State>("checking");
  const [expanded, setExpanded] = useState(false);
  const words = WORDS[locale];
  useEffect(() => {
    document.documentElement.setAttribute("data-cg-theme", theme);
    safeWrite(KEY_THEME, theme);
  }, [theme]);
  useEffect(() => { safeWrite(KEY_LOCALE, locale); }, [locale]);
  useEffect(() => {
    const ready = () => setState("online");
    const waking = () => setState("waking");
    const offline = () => setState("offline");
    const browserOnline = () => { setState("checking"); void warmBackend(); };
    window.addEventListener("cropguard:backend-ready", ready);
    window.addEventListener("cropguard:backend-starting", waking);
    window.addEventListener("cropguard:backend-waiting", waking);
    window.addEventListener("cropguard:backend-timeout", offline);
    window.addEventListener("offline", offline);
    window.addEventListener("online", browserOnline);
    if (!navigator.onLine) setState("offline");
    else void warmBackend().then(ok => setState(ok ? "online" : "offline"));
    return () => {
      window.removeEventListener("cropguard:backend-ready", ready);
      window.removeEventListener("cropguard:backend-starting", waking);
      window.removeEventListener("cropguard:backend-waiting", waking);
      window.removeEventListener("cropguard:backend-timeout", offline);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", browserOnline);
    };
  }, []);
  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(words.note);
    msg.lang = locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
    window.speechSynthesis.speak(msg);
  };
  const deleteFeedback = () => {
    if (!window.confirm("Delete CropGuard feedback saved on this device?")) return;
    try { localStorage.removeItem("cropguard:diagnosis-feedback:v1"); } catch { /* local storage unavailable */ }
  };
  return (
    <section className="cg-trust-dock" aria-label="CropGuard settings and service health">
      <button className="cg-trust-trigger" type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} aria-controls="cg-trust-panel">
        {state === "online" ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span>{words.status}: {state === "online" ? words.online : state === "offline" ? words.offline : words.waking}</span>
      </button>
      {expanded ? <div className="cg-trust-panel" id="cg-trust-panel">
        <div className="cg-trust-heading"><ShieldCheck size={18} /><strong>CropGuard controls</strong></div>
        <p role="status">{words.note}</p>
        <div className="cg-trust-actions">
          <button type="button" onClick={() => setTheme(v => v === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />} {theme === "light" ? "Dark" : "Light"}</button>
          <label><Languages size={16} /> <span className="sr-only">Language</span><select aria-label="Interface assistance language" value={locale} onChange={e => setLocale(e.target.value as Locale)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="te">తెలుగు</option></select></label>
          <button type="button" onClick={speak}><Volume2 size={16} /> Read note</button>
          <button type="button" onClick={() => { setState("waking"); void warmBackend().then(ok => setState(ok ? "online" : "offline")); }}><RefreshCw size={16} /> {words.retry}</button>
          <button type="button" onClick={deleteFeedback}><Trash2 size={16} /> {words.privacy}</button>
        </div>
        <small>Language assistance applies to this panel. Full application translation requires human-reviewed content.</small>
      </div> : null}
    </section>
  );
}
