/** Explicit, reversible UI-label localization for screens that predate i18n.
 * A carefully reviewed dictionary: no network translation and NO automatic
 * translation of chemical dosages, model diagnoses or user-provided text.
 * React remains the owner of elements; we only update existing static text
 * nodes and supported input attributes, including lazy-loaded routes.
 */
type Lang = "en" | "hi" | "te";
const LABELS: Record<string, readonly [string,string]> = {
  "Field intelligence": ["खेत की जानकारी", "పొలం సమాచారం"],
  "Home Planters": ["घर के पौधे", "ఇంటి మొక్కలు"],
  "Field overview": ["खेत का सारांश", "పొలం సమీక్ష"],
  "Crop health, at a glance": ["फसल की स्थिति एक नज़र में", "పంట ఆరోగ్యం ఒక చూపులో"],
  "A calm view of your fields, screenings, alerts and environmental signals.": ["आपके खेत, जाँच, चेतावनियाँ और मौसम की जानकारी एक जगह।", "మీ పొలాలు, పరిశీలనలు, హెచ్చరికలు, వాతావరణ సమాచారం ఒకే చోట."],
  "Screen leaf": ["पत्ती जाँचें", "ఆకును పరిశీలించండి"],
  "Check risk": ["जोखिम देखें", "ప్రమాదాన్ని చూడండి"],
  "Manage farms": ["खेत सँभालें", "పొలాలను నిర్వహించండి"],
  "Care cases": ["देखभाल मामले", "సంరక్షణ కేసులు"],
  "Active fields": ["सक्रिय खेत", "క్రియాశీల పొలాలు"],
  "Diagnoses": ["जाँच परिणाम", "పరిశీలన ఫలితాలు"],
  "Review diagnosis history.": ["पिछली जाँचें देखें।", "గత పరిశీలనలను చూడండి."],
  "Farm management": ["खेत प्रबंधन", "పొలాల నిర్వహణ"],
  "Your farms": ["आपके खेत", "మీ పొలాలు"],
  "Register farm locations and organize the crop fields that belong to each farm.": ["खेतों की जगह दर्ज करें और उनमें उगने वाली फसलों को व्यवस्थित करें।", "మీ పొలాల స్థానాలను నమోదు చేసి, పంట పొలాలను నిర్వహించండి."],
  "Add farm": ["खेत जोड़ें", "పొలం జోడించండి"],
  "Register a farm": ["खेत दर्ज करें", "పొలం నమోదు చేయండి"],
  "Add the location that contains your crop fields.": ["फसल के खेतों का स्थान जोड़ें।", "మీ పంట పొలాల స్థానాన్ని నమోదు చేయండి."],
  "Farm name *": ["खेत का नाम *", "పొలం పేరు *"],
  "Farm name": ["खेत का नाम", "పొలం పేరు"],
  "Village": ["गाँव", "గ్రామం"],
  "District": ["ज़िला", "జిల్లా"],
  "State": ["राज्य", "రాష్ట్రం"],
  "Country": ["देश", "దేశం"],
  "Save farm": ["खेत सहेजें", "పొలం సేవ్ చేయండి"],
  "Create farm": ["खेत बनाएँ", "పొలం సృష్టించండి"],
  "Weather-driven pressure": ["मौसम से बीमारी का जोखिम", "వాతావరణ ఆధారిత వ్యాధి ప్రమాదం"],
  "Why this score": ["इस अंक का कारण", "ఈ స్కోరు ఎందుకు"],
  "High": ["अधिक", "ఎక్కువ"],
  "Low": ["कम", "తక్కువ"],
  "Moderate": ["मध्यम", "మధ్యస్థం"],
  "Critical": ["अति गंभीर", "అత్యంత తీవ్రమైనది"],
  "Weather risk": ["मौसम का जोखिम", "వాతావరణ ప్రమాదం"],
  "Weather and risk": ["मौसम और जोखिम", "వాతావరణం మరియు ప్రమాదం"],
  "Current conditions": ["मौजूदा मौसम", "ప్రస్తుత వాతావరణం"],
  "5-day forecast": ["अगले 5 दिनों का मौसम", "5 రోజుల వాతావరణ అంచనా"],
  "Temperature": ["तापमान", "ఉష్ణోగ్రత"],
  "Relative humidity": ["सापेक्ष आर्द्रता", "సాపేక్ష తేమ"],
  "Rainfall": ["वर्षा", "వర్షపాతం"],
  "Humidity": ["आर्द्रता", "తేమ"],
  "This score is an agronomic decision-support signal based on weather and crop rules. It is not a laboratory diagnosis.": ["यह मौसम और फसल की जानकारी पर आधारित चेतावनी है, प्रयोगशाला का निदान नहीं।", "ఇది వాతావరణం మరియు పంట పరిస్థితుల ఆధారంగా ఇచ్చే సూచన మాత్రమే. ప్రయోగశాల నిర్ధారణ కాదు."],
  "CropGuard · Flower care": ["क्रॉपगार्ड · फूलों की देखभाल", "క్రాప్‌గార్డ్ · పూల సంరక్షణ"],
  "Explore 46 flowering plants": ["46 फूलदार पौधे देखें", "46 పూల మొక్కలను తెలుసుకోండి"],
  "Find a rose, jasmine, hibiscus, marigold, orchid and many more. Choose a plant for a complete care guide, or use a suggested flower after photo analysis.": ["गुलाब, चमेली, गुड़हल, गेंदा और अन्य पौधों की जानकारी पाएँ। देखभाल के लिए पौधा चुनें या फोटो की पहचान के बाद सुझाव देखें।", "గులాబీ, మల్లె, మందారం, బంతి తదితర పూల మొక్కల గురించి తెలుసుకోండి. సంరక్షణ కోసం మొక్కను ఎంచుకోండి లేదా ఫోటో పరిశీలన తర్వాత సూచనలను చూడండి."],
  "46 guides": ["46 देखभाल मार्गदर्शिकाएँ", "46 సంరక్షణ మార్గదర్శకాలు"],
  "All flowers": ["सभी फूल", "అన్ని పూలు"],
  "Search rose, jasmine, orchid…": ["गुलाब, चमेली, ऑर्किड खोजें…", "గులాబీ, మల్లె, ఆర్కిడ్ వెతకండి…"],
  "Search rose, jasmine, orchid...": ["गुलाब, चमेली, ऑर्किड खोजें...", "గులాబీ, మల్లె, ఆర్కిడ్ వెతకండి..."],
  "Selected care guide · Not photo-confirmed": ["चुनी गई देखभाल गाइड · फोटो से पुष्टि नहीं", "ఎంచుకున్న సంరక్షణ మార్గదర్శకం · ఫోటోతో నిర్ధారించలేదు"],
  "Community photo references": ["सामुदायिक फोटो उदाहरण", "సముదాయ ఫోటో ఉదాహరణలు"],
  "Find Rose photos": ["गुलाब की फोटो खोजें", "గులాబీ ఫోటోలు వెతకండి"],
  "Find photos mentioning black spot": ["काले धब्बों वाली फोटो खोजें", "నల్ల మచ్చల ఫోటోలు వెతకండి"],
  "Select a photo search above. Some flowers have no suitable openly licensed images.": ["ऊपर फोटो खोजें। कुछ फूलों की उपयुक्त मुक्त-लाइसेंस फोटो नहीं मिल सकतीं।", "పై ఫోటో శోధనను ఎంచుకోండి. కొన్ని పూలకు తగిన ఓపెన్-లైసెన్స్ ఫోటోలు లేకపోవచ్చు."],
  "The Wikimedia Commons search requires internet. Images are not training data and are not saved with care reports.": ["फोटो खोजने के लिए इंटरनेट चाहिए। ये प्रशिक्षण डेटा नहीं हैं और देखभाल रिपोर्ट में सेव नहीं होतीं।", "ఫోటోల కోసం ఇంటర్నెట్ అవసరం. ఇవి శిక్షణ డేటా కావు; సంరక్షణ నివేదికల్లో నిల్వ చేయబడవు."],
  "Light": ["धूप", "వెలుతురు"],
  "Watering": ["पानी देना", "నీరు పోయడం"],
  "Soil": ["मिट्टी", "నేల"],
  "Fertilizer": ["खाद", "ఎరువులు"],
  "Pruning": ["छँटाई", "కత్తిరింపు"],
  "Flowering": ["फूल आना", "పుష్పించడం"],
  "Propagation": ["नए पौधे उगाना", "కొత్త మొక్కలను పెంచడం"],
  "Pests and diseases": ["कीट और बीमारियाँ", "పురుగులు మరియు వ్యాధులు"],
  "Common concerns": ["आम समस्याएँ", "సాధారణ సమస్యలు"],
  "Care checklist": ["देखभाल सूची", "సంరక్షణ జాబితా"],
  "Flower care": ["फूलों की देखभाल", "పూల సంరక్షణ"],
  "Care guide": ["देखभाल मार्गदर्शिका", "సంరక్షణ మార్గదర్శకం"],
  "Back": ["वापस", "వెనక్కి"],
  "Retry": ["फिर कोशिश करें", "మళ్లీ ప్రయత్నించండి"],
  "Loading": ["लोड हो रहा है", "లోడ్ అవుతోంది"],
  "Save": ["सहेजें", "సేవ్ చేయండి"],
  "Cancel": ["रद्द करें", "రద్దు చేయండి"],
  "Search": ["खोजें", "వెతకండి"],
  "History": ["इतिहास", "చరిత్ర"],
  "Settings": ["सेटिंग्स", "సెట్టింగ్‌లు"],
  "Sign in to CropGuard": ["क्रॉपगार्ड में साइन इन करें", "క్రాప్‌గార్డ్‌లో సైన్ ఇన్ అవ్వండి"],
  "Sign in": ["साइन इन", "సైన్ ఇన్"],
  "Email": ["ईमेल", "ఇమెయిల్"],
  "Password": ["पासवर्ड", "పాస్‌వర్డ్"],
  "Forgot password?": ["पासवर्ड भूल गए?", "పాస్‌వర్డ్ మర్చిపోయారా?"],
  "No farm or field is required.": ["खेत जोड़ना ज़रूरी नहीं है।", "పొలం జోడించాల్సిన అవసరం లేదు."],
  "CROPGUARD · HOME PLANTERS": ["क्रॉपगार्ड · घरेलू पौधे", "క్రాప్‌గార్డ్ · ఇంటి మొక్కలు"],
  "CROPGUARD · FLOWER CARE": ["क्रॉपगार्ड · फूलों की देखभाल", "క్రాప్‌గార్డ్ · పూల సంరక్షణ"],
  "Photo analysis and care guidance": ["फोटो जाँच और देखभाल", "ఫోటో పరిశీలన మరియు సంరక్షణ"],
  "1. Photograph your plant": ["1. पौधे की फ़ोटो लें", "1. మొక్క ఫోటో తీయండి"],
  "2. Confirm your plant": ["2. पौधे की पुष्टि करें", "2. మీ మొక్కను నిర్ధారించండి"],
  "3. Add observations (optional)": ["3. लक्षण बताएँ (वैकल्पिक)", "3. లక్షణాలను చేర్చండి (ఐచ్ఛికం)"],
  "Analyze photo and get care guidance": ["फोटो जाँचें और सलाह पाएँ", "ఫోటో పరిశీలించి సంరక్షణ సూచనలు పొందండి"],
  "Take photo": ["फ़ोटो लें", "ఫోటో తీయండి"],
  "Upload image": ["फोटो चुनें", "ఫోటో ఎంచుకోండి"],
  "Photo screened": ["फ़ोटो जाँची गई", "ఫోటో పరిశీలించబడింది"],
  "Server connection": ["सर्वर कनेक्शन", "సర్వర్ కనెక్షన్"],
  "Waking up server": ["सर्वर शुरू हो रहा है", "సర్వర్ ప్రారంభమవుతోంది"],
};

const TEMPLATES: readonly { pattern: RegExp; render: (match: RegExpMatchArray, lang: Lang) => string }[] = [
  {
    pattern: /^Temperature of ([\d.,]+)\s*°C is favourable for several foliar pathogens\.$/i,
    render: (m,l) => l === 'hi' ? `${m[1]}°C का तापमान कई पत्ती रोगों के लिए अनुकूल है।` : `${m[1]}°C ఉష్ణోగ్రత అనేక ఆకు వ్యాధులకు అనుకూలంగా ఉంటుంది.`,
  },
  {
    pattern: /^Relative humidity is high at ([\d.,]+)%, which slows leaf drying and raises disease pressure\.$/i,
    render: (m,l) => l === 'hi' ? `${m[1]}% आर्द्रता अधिक है। पत्तियाँ देर से सूखती हैं और रोग का जोखिम बढ़ता है।` : `సాపేక్ష తేమ ${m[1]}% ఎక్కువగా ఉంది. ఆకులు ఆలస్యంగా ఎండడం వల్ల వ్యాధి ప్రమాదం పెరుగుతుంది.`,
  },
  {
    pattern: /^Rain is forecast during the next three days, so monitor leaves for new symptoms\.$/i,
    render: (_m,l) => l === 'hi' ? 'अगले तीन दिनों में बारिश की संभावना है। पत्तियों पर नए लक्षण देखें।' : 'తదుపరి మూడు రోజుల్లో వర్షం పడే అవకాశం ఉంది. ఆకులపై కొత్త లక్షణాలను గమనించండి.',
  },
  {
    pattern: /^Potato is especially sensitive to foliar disease pressure under warm, humid conditions\.$/i,
    render: (_m,l) => l === 'hi' ? 'गर्म और नम मौसम में आलू की पत्तियों पर रोग का जोखिम बढ़ सकता है।' : 'వెచ్చని, తేమ ఉన్న వాతావరణంలో బంగాళాదుంప ఆకులకు వ్యాధి ప్రమాదం ఎక్కువగా ఉండవచ్చు.',
  },
];

const originals = new WeakMap<Text, { source: string; rendered: string }>();
const originalAttrs = new WeakMap<Element, Record<string, string>>();
const IGNORE = 'script,style,code,pre,[contenteditable],.cg-no-translate,[translate="no"]';
const attrs = ['placeholder','title','aria-label'] as const;
function currentLanguage(): Lang {
  try {const value = localStorage.getItem('cropguard:language');return value === 'hi' || value === 'te' ? value : 'en';}
  catch { return 'en'; }
}
const fold = (phrase: string): string => phrase.trim().toLocaleLowerCase('en-IN');
const lookup = new Map<string,string>();
for(const phrase of Object.keys(LABELS)) {
  lookup.set(fold(phrase),phrase);
  // Under noUncheckedIndexedAccess, index access may be undefined even
  // when the key came from Object.keys(). Guard before destructuring.
  const translations = LABELS[phrase];
  if (!translations) continue;
  const [hi,te] = translations;
  lookup.set(fold(hi),phrase);
  lookup.set(fold(te),phrase);
}
function translate(input: string, lang: Lang): string {
  const source = lookup.get(fold(input));
  if (lang === 'en') return source ?? input;
  const translations = source ? LABELS[source] : undefined;
  if (translations) return translations[lang === 'hi' ? 0 : 1];
  for(const t of TEMPLATES) {
    const m = input.trim().match(t.pattern);
    if(m) return t.render(m,lang);
  }
  return input; // Unsupported medical, pesticide or dynamic prose is not machine translated.
}
function updateText(node: Text, lang: Lang): void {
  const raw = node.nodeValue ?? '';
  if (!raw.trim()) return;
  const prev = originals.get(node);
  const source = prev && prev.rendered === raw ? prev.source : raw;
  const translated = translate(source,lang);
  const whitespace = source.match(/^(\s*)/u)?.[1] ?? '';
  const trail = source.match(/(\s*)$/u)?.[1] ?? '';
  const next = translated === source ? source : whitespace + translated.trim() + trail;
  originals.set(node,{source,rendered:next});
  if (raw !== next) node.nodeValue = next;
}
function processElement(el: Element,lang:Lang):void {
  if(el.matches(IGNORE) || el.closest(IGNORE)) return;
  const backup = originalAttrs.get(el) ?? {};
  for(const attr of attrs) {
    const raw = el.getAttribute(attr);
    if(raw === null || !raw.trim()) continue;
    const previous=backup[attr];
    const source=previous ?? raw;
    const translated=translate(source,lang);
    const next=translated === source ? source : translated;
    if(next !== raw) el.setAttribute(attr,next);
    backup[attr] = source;
  }
  originalAttrs.set(el,backup);
}
let pending=false;
function update():void {
  if(!document.body) return;
  const lang=currentLanguage();
  document.documentElement.lang=lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : 'en';
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];
  while(walker.nextNode())nodes.push(walker.currentNode as Text);
  for(const node of nodes) {
    if(node.parentElement && !node.parentElement.closest(IGNORE)) updateText(node,lang);
  }
  document.body.querySelectorAll('input,textarea,button,select,a,[aria-label]').forEach(el=>processElement(el,lang));
}
function schedule():void {
  if(pending)return;
  pending=true;
  queueMicrotask(()=>{pending=false;update();});
}
export function installCropGuardLocaleBridge():void {
  if(typeof document === 'undefined')return;
  if(!document.body){document.addEventListener('DOMContentLoaded',installCropGuardLocaleBridge,{once:true});return;}
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('cropguard:language-changed',schedule);
  window.addEventListener('storage',event=>{if(event.key==='cropguard:language')schedule();});
}
if(typeof window !== 'undefined')installCropGuardLocaleBridge();
