import { useSyncExternalStore } from "react";

export type Language = "en" | "hi" | "te";
export type Appearance = "light" | "dark";
export const CG_LANGUAGE_KEY = "cropguard:language";
export const CG_THEME_KEY = "cropguard:ui-theme";

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* optional local preference */ }
}
export function getLanguage(): Language {
  const current = readStorage(CG_LANGUAGE_KEY);
  return current === "hi" || current === "te" ? current : "en";
}
export function getAppearance(): Appearance {
  return readStorage(CG_THEME_KEY) === "dark" ? "dark" : "light";
}
const listeners = new Set<() => void>();
let currentLanguage: Language | null = null;
function getSnapshot(): Language {
  if (currentLanguage === null) currentLanguage = getLanguage();
  return currentLanguage;
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useCropGuardLanguage(): Language {
  return useSyncExternalStore(subscribe, getSnapshot, () => "en");
}
export function setCropGuardLanguage(language: Language): void {
  currentLanguage = language;
  writeStorage(CG_LANGUAGE_KEY, language);
  document.documentElement.lang = language === "te" ? "te" : language === "hi" ? "hi" : "en";
  for (const listener of listeners) listener();
  window.dispatchEvent(new Event("cropguard:language-changed"));
}

// Reviewed short UI phrases only. Clinical model explanations remain in English
// until translated and safety-reviewed; never machine-translate treatment doses.
const WORDS: Record<string, [string, string]> = {
  "Settings": ["सेटिंग्स", "సెట్టింగ్‌లు"],
  "Appearance": ["दिखावट", "రూపం"],
  "Light mode": ["लाइट मोड", "లైట్ మోడ్"],
  "Dark mode": ["डार्क मोड", "డార్క్ మోడ్"],
  "Language": ["भाषा", "భాష"],
  "Server connection": ["सर्वर कनेक्शन", "సర్వర్ కనెక్షన్"],
  "Connected": ["कनेक्ट हो गया", "కనెక్ట్ అయ్యింది"],
  "Connecting": ["कनेक्ट हो रहा है", "కనెక్ట్ అవుతోంది"],
  "Waking up server": ["सर्वर शुरू हो रहा है", "సర్వర్ ప్రారంభమవుతోంది"],
  "Connection unavailable": ["कनेक्शन उपलब्ध नहीं", "కనెక్షన్ అందుబాటులో లేదు"],
  "Retry connection": ["फिर जोड़ें", "మళ్లీ కనెక్ట్ చేయండి"],
  "Your account": ["आपका खाता", "మీ ఖాతా"],
  "Profile": ["प्रोफ़ाइल", "ప్రొఫైల్"],
  "Sign out": ["साइन आउट", "సైన్ అవుట్"],
  "Close settings": ["सेटिंग्स बंद करें", "సెట్టింగ్‌లను మూసివేయండి"],
  "Delete saved feedback": ["सेव की हुई प्रतिक्रिया हटाएँ", "సేవ్ చేసిన అభిప్రాయాన్ని తొలగించండి"],
  "Read this note": ["यह नोट सुनें", "ఈ గమనిక వినండి"],
  "Home": ["होम", "హోమ్"],
  "Farms": ["खेत", "పొలాలు"],
  "Detect": ["जाँच", "గుర్తింపు"],
  "Care": ["देखभाल", "సంరక్షణ"],
  "Plants": ["पौधे", "మొక్కలు"],
  "Overview": ["अवलोकन", "అవలోకనం"],
  "Cases": ["मामले", "కేసులు"],
  "Admin": ["प्रशासन", "అడ్మిన్"],
  "Users": ["उपयोगकर्ता", "వినియోగదారులు"],
  "Areas": ["क्षेत्र", "ప్రాంతాలు"],
  "Home Planters": ["घरेलू पौधे", "ఇంటి మొక్కలు"],
  "Take or upload a photo to screen visible foliage patterns and receive practical care guidance. No farm or field is required.": ["पत्तियों के दिखने वाले संकेत देखने के लिए फ़ोटो लें या चुनें। देखभाल के सुझाव मिलेंगे। खेत जोड़ना ज़रूरी नहीं है।", "ఆకులపై కనిపించే మార్పులను పరిశీలించేందుకు ఫోటో తీయండి లేదా ఎంచుకోండి. సంరక్షణ సూచనలు పొందండి. పొలం జోడించాల్సిన అవసరం లేదు."],
  "Confirm the plant name for species-specific care. Photo-based automatic species identification awaits a validated model.": ["सही देखभाल के लिए पौधे का नाम चुनें। स्वचालित पहचान अभी सत्यापित नहीं है।", "సరైన సంరక్షణ కోసం మొక్క పేరును ఎంచుకోండి. స్వయంచాలక గుర్తింపు ఇంకా ధృవీకరించబడలేదు."],
  "Tell CropGuard what you see on the real leaves. This helps distinguish visible symptoms from photo backgrounds.": ["असली पत्तियों पर दिखने वाले लक्षण बताएँ ताकि पृष्ठभूमि का रंग अलग समझा जा सके।", "ఆకులపై నిజంగా కనిపించే లక్షణాలను తెలపండి. నేపథ్య రంగుల నుంచి వేరు చేయడానికి ఇది సహాయపడుతుంది."],
  "Take photo": ["फ़ोटो लें", "ఫోటో తీయండి"],
  "Upload image": ["फ़ोटो चुनें", "ఫోటో ఎంచుకోండి"],
  "Analyze photo and get care guidance": ["फ़ोटो जाँचें और सलाह पाएँ", "ఫోటో పరిశీలించి సంరక్షణ సూచనలు పొందండి"],
  "Analyzing photo…": ["फ़ोटो जाँची जा रही है…", "ఫోటో పరిశీలన జరుగుతోంది…"],
  "1. Photograph your plant": ["१. पौधे की फ़ोटो लें", "1. మొక్క ఫోటో తీయండి"],
  "2. Confirm your plant": ["२. पौधे की पुष्टि करें", "2. మీ మొక్కను నిర్ధారించండి"],
  "3. Add observations (optional)": ["३. लक्षण बताएँ (वैकल्पिक)", "3. లక్షణాలను చేర్చండి (ఐచ్ఛికం)"],
  "Photo analysis and care guidance": ["फ़ोटो जाँच और देखभाल सलाह", "ఫోటో విశ్లేషణ మరియు సంరక్షణ సూచనలు"],
  "On-device observation history": ["डिवाइस पर जाँच का इतिहास", "పరికరంలోని పరిశీలన చరిత్ర"],
  "Photo screened": ["फ़ोटो जाँची गई", "ఫోటో పరిశీలించబడింది"],
  "Retake recommended": ["दुबारा फ़ोटो लेने की सलाह", "మరొక ఫోటో మంచిది"],
  "Original photo preserved": ["मूल फ़ोटो सुरक्षित", "అసలు ఫోటో భద్రంగా ఉంది"],
  "Enhanced for visibility": ["देखने के लिए चमक बढ़ाई", "కనిపించేందుకు ప్రకాశం పెంచాం"],
  "What the image shows": ["फ़ोटो में क्या दिख रहा है", "ఫోటోలో కనిపిస్తున్నవి"],
  "Recommended care and follow-up": ["देखभाल और अगला कदम", "సంరక్షణ మరియు తదుపరి చర్యలు"],
  "Save observation": ["जाँच सहेजें", "పరిశీలనను సేవ్ చేయండి"],
  "Delete history": ["इतिहास हटाएँ", "చరిత్ర తొలగించండి"],
  "Retake only if important details are missing.": ["ज़रूरी विवरण न दिखें, तभी नई फ़ोटो लें।", "ముఖ్యమైన వివరాలు కనిపించకపోతేనే మరో ఫోటో తీయండి."],
  "AI screening is not a confirmed diagnosis.": ["AI जाँच निश्चित रोग निदान नहीं है।", "AI పరిశీలన ఖచ్చితమైన వ్యాధి నిర్ధారణ కాదు."],
};
export function cgText(english: string, language: Language): string {
  const pair = WORDS[english];
  return language === "en" || !pair ? english : pair[language === "hi" ? 0 : 1];
}
export const CORE_WORDS = WORDS;
