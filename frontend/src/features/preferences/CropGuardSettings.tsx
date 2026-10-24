import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, Languages, LogOut, Moon, RefreshCw, Settings2, Sun, Trash2, Volume2, WifiOff, X } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { routes } from "@/config/routes";
import { warmBackend } from "@/services/backendWarmup";
import { cgText, getAppearance, getLanguage, setCropGuardLanguage, type Appearance, type Language, useCropGuardLanguage } from "./preferences";
import "@/styles/cropguard-premium.css";
import "./cropguard-settings.css";
import "@/styles/cropguard-theme-fix.css";
import { trackVisualViewportChrome } from "@/services/visualViewportChrome";

type Status = "connecting" | "waking" | "connected" | "unavailable";
const INITIAL_NOTE = "AI screening is not a confirmed diagnosis.";
function applyAppearance(mode: Appearance): void {
  document.documentElement.setAttribute("data-cg-theme", mode);
  try { localStorage.setItem("cropguard:ui-theme", mode); } catch { /* optional preference */ }
}
export function CropGuardSettings() {
  const language = useCropGuardLanguage();
  const [theme, setTheme] = useState<Appearance>(getAppearance);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("connecting");
  const closeRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const logout = useAuthStore(s => s.logout);
  const t = (phrase: string) => cgText(phrase, language);
  useEffect(() => {
    applyAppearance(theme);
  }, [theme]);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const connected = () => setStatus("connected");
    const waking = () => setStatus("waking");
    const unavailable = () => setStatus("unavailable");
    const onOffline = () => setStatus("unavailable");
    window.addEventListener("cropguard:open-settings", onOpen);
    window.addEventListener("cropguard:backend-ready", connected);
    window.addEventListener("cropguard:backend-starting", waking);
    window.addEventListener("cropguard:backend-waiting", waking);
    window.addEventListener("cropguard:backend-timeout", unavailable);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setStatus("unavailable");
    else void warmBackend().then(ok => setStatus(ok ? "connected" : "unavailable"));
    setCropGuardLanguage(getLanguage());
    return () => {
      window.removeEventListener("cropguard:open-settings", onOpen);
      window.removeEventListener("cropguard:backend-ready", connected);
      window.removeEventListener("cropguard:backend-starting", waking);
      window.removeEventListener("cropguard:backend-waiting", waking);
      window.removeEventListener("cropguard:backend-timeout", unavailable);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", escape);
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", escape); previous?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const backdrop = backdropRef.current;
    if (!backdrop) return;
    // The background page cannot move independently of the Settings sheet.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const stopTracking = trackVisualViewportChrome(backdrop, "settings");
    return () => {
      stopTracking();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const message = new SpeechSynthesisUtterance(t(INITIAL_NOTE));
    message.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(message);
  };
  const retry = () => {
    setStatus("waking");
    void warmBackend().then(ok => setStatus(ok ? "connected" : "unavailable"));
  };
  const signOut = () => {
    setOpen(false);
    void logout();
    window.location.hash = `#${routes.login}`;
  };
  return open ? createPortal(<div ref={backdropRef} className="cg-settings-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="cg-settings-sheet" role="dialog" aria-modal="true" aria-labelledby="cg-settings-title">
        <header className="cg-settings-header">
          <div><p className="cg-settings-eyebrow">CROPGUARD AI</p><h2 id="cg-settings-title"><Settings2 size={23} /> {t("Settings")}</h2></div>
          <button ref={closeRef} type="button" className="cg-settings-icon" onClick={() => setOpen(false)} aria-label={t("Close settings")}><X /></button>
        </header>
        <div className="cg-settings-body">
          <fieldset className="cg-settings-group"><legend>{t("Appearance")}</legend>
            <div className="cg-settings-row"><button type="button" className={theme === "light" ? "chosen" : ""} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={20}/>{t("Light mode")}</button>
            <button type="button" className={theme === "dark" ? "chosen" : ""} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={20}/>{t("Dark mode")}</button></div>
          </fieldset>
          <div className="cg-settings-group"><label className="cg-settings-label" htmlFor="cg-language"><Languages size={20}/>{t("Language")}</label>
            <select id="cg-language" value={language} onChange={e => setCropGuardLanguage(e.target.value as Language)}><option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="te">తెలుగు (Telugu)</option></select>
            <p className="cg-settings-hint">{language === "te" ? "ప్రధాన మెనూలు, ఫోటో సూచనలు తెలుగులో కనిపిస్తాయి. వైద్య/పురుగుమందుల సూచనలు ధృవీకరణ వరకు ఆంగ్లంలోనే ఉంటాయి." : language === "hi" ? "मुख्य मेनू और फ़ोटो निर्देश हिन्दी में दिखेंगे। सुरक्षा-संबंधी उपचार विवरण सत्यापन तक अंग्रेज़ी में रहेंगे।" : "Main navigation and photo instructions are localized. Detailed agronomic treatment text remains English until professionally reviewed."}</p>
          </div>
          <div className="cg-settings-group"><div className="cg-settings-label">{status === "connected" ? <CheckCircle2 size={20}/> : status === "unavailable" ? <CircleAlert size={20}/> : <WifiOff size={20}/>}{t("Server connection")}</div>
            <p aria-live="polite" className="cg-settings-state">{t(status === "connected" ? "Connected" : status === "unavailable" ? "Connection unavailable" : status === "waking" ? "Waking up server" : "Connecting")}</p>
            <p className="cg-settings-hint">{language === "te" ? "సర్వర్ ప్రారంభానికి ఒక నిమిషం పట్టవచ్చు. మీ ఫోటోలు స్వయంగా తొలగించబడవు." : language === "hi" ? "सर्वर को शुरू होने में एक मिनट लग सकता है। आपकी फ़ोटो अपने आप नहीं हटाई जाएँगी।" : "Render may need up to about a minute to wake. You can retry without losing your photo."}</p>
            <button className="cg-settings-action" type="button" onClick={retry}><RefreshCw size={18}/>{t("Retry connection")}</button>
          </div>
          <div className="cg-settings-group"><p className="cg-settings-hint">{t(INITIAL_NOTE)}</p>
            <button className="cg-settings-action" type="button" onClick={speak}><Volume2 size={18}/>{t("Read this note")}</button>
            <button className="cg-settings-action" type="button" onClick={() => { if (!window.confirm("Delete saved CropGuard correction feedback from this device?")) return; try { localStorage.removeItem("cropguard:diagnosis-feedback:v1"); } catch { /* storage unavailable */ } }}><Trash2 size={18}/>{t("Delete saved feedback")}</button>
          </div>
          <div className="cg-settings-group"><p className="cg-settings-label">{t("Your account")}</p>
            <button className="cg-settings-action cg-settings-logout" type="button" onClick={signOut}><LogOut size={18}/>{t("Sign out")}</button>
          </div>
        </div>
      </section>
    </div>, document.body) : null;
}
