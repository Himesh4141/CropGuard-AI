import type { Diagnosis } from "@/features/diagnosis/types";
import { buildCropCareSteps } from "@/features/diagnosis/careSteps";
import type { Language } from "@/features/preferences/preferences";
import { t, type TranslationKey } from "./index";

/** Recognized disease/condition terms only; unknown ML classes remain original. */
const conditions: ReadonlyArray<[RegExp, TranslationKey]> = [
  [/\b(healthy|no disease)\b/i, "healthy"], [/\blate[ _-]?blight\b/i, "lateBlight"],
  [/\bearly[ _-]?blight\b/i, "earlyBlight"], [/\bbacterial[ _-]?spot\b/i, "bacterialSpot"],
  [/\bleaf[ _-]?mold\b/i, "leafMold"], [/\bseptoria\b/i, "septoriaLeafSpot"],
  [/\bleaf[ _-]?curl\b/i, "leafCurl"], [/\bpowdery[ _-]?mildew\b/i, "powderyMildew"],
  [/\bdowny[ _-]?mildew\b/i, "downyMildew"], [/\brust\b/i, "rust"],
  [/\b(mosaic|virus)\b/i, "mosaicVirus"], [/\bwilt\b/i, "wilt"],
  [/\bblack[ _-]?spot\b/i, "blackSpot"], [/\banthracnose\b/i, "anthracnose"],
  [/\bcommon[ _-]?scab\b/i, "commonScab"],
];
export function localizeCondition(raw: string, language: Language): { value: string; translated: boolean } {
  if (language === "en") return { value: raw.replaceAll("_", " "), translated: true };
  const label = raw.includes("___") ? raw.split("___").slice(1).join("___") : raw;
  for (const [pattern, key] of conditions) if (pattern.test(label.replaceAll("_", " "))) {
    return { value: t(key, language), translated: true };
  }
  return { value: raw.replaceAll("_", " "), translated: false };
}

// Reviewed conservative follow-up summaries for every classification group. No
// pesticide name/dose is machine-translated and no model score is recalibrated.
const careHi = {
  uncertain: ["दिन के उजाले में दो साफ़ फ़ोटो लें: पूरा पौधा और पत्ती की दोनों सतहों का पास से दृश्य।", "देखें कि ऐसे लक्षण कई पौधों पर हैं या केवल एक पर। स्वस्थ पौधे से तुलना करें।", "रोग के अनुसार दवा शुरू करने से पहले कृषि अधिकारी की सलाह लें। बदलावों का रिकॉर्ड रखें।"],
  healthy: ["इस फ़ोटो में मॉडल को रोग का स्पष्ट संकेत नहीं मिला। हर कुछ दिन नई पत्तियाँ देखें; एक स्वस्थ दिखती तस्वीर से शुरुआती रोग से इनकार नहीं होता।"],
  blight: ["झुलसे जैसे लक्षण दिखे हैं। खासकर बारिश के बाद पास के पौधों पर फैलते भूरे धब्बे देखें और फैलने की गति लिखें।", "जहाँ संभव हो ऊपर से पानी देने से बचें, हवा आने दें और गिरे हुए प्रभावित पत्ते साफ़ औज़ार से हटाएँ। नुकसान बढ़े तो स्थानीय सलाह लें।"],
  mildew: ["फफूँद जैसे लक्षण दिखे हैं। पत्तियों की दोनों सतहों पर सफ़ेद परत या रंग-बदलाव देखें।", "पौधों में दूरी और हवा रखें, शाम में पत्तियाँ गीली न करें। इलाज से पहले स्थानीय कृषि विशेषज्ञ से पुष्टि लें।"],
  rust: ["रतुआ जैसे लक्षण दिखे हैं। कई पत्तियों के नीचे उभरे नारंगी-भूरे दाने देखें।", "कौन-सी पत्तियाँ प्रभावित हैं, दर्ज करें। फफूँदनाशक डालने से पहले स्थानीय पुष्टि लें।"],
  spot: ["पत्ती पर धब्बों जैसे संकेत मिले हैं। नए धब्बों की तस्वीर लें; पोषक तत्वों की कमी भी ऐसी दिख सकती है।", "पत्तियों से पानी के छींटे स्वस्थ पौधों पर न पड़ने दें। विशेषज्ञ से कारण की पुष्टि कराएँ।"],
  virus: ["विषाणु जैसे पत्ती मुड़ने या चितकबरे संकेत मिले हैं। नई पत्तियाँ और उनके नीचे माहू या सफ़ेद मक्खी देखें।", "जहाँ संभव हो प्रभावित पौधों को अलग रखें। पौधे हटाने से पहले विशेषज्ञ से पूछें; कीटनाशक विषाणु को नहीं मिटाते।"],
  wilt: ["मुरझाना पानी की कमी, जलभराव, गर्मी या रोग से हो सकता है। मिट्टी की नमी और तना जाँचें।"],
  other: ["यह तस्वीर फसल की समस्या का संकेत देती है। प्रभावित और स्वस्थ पौधों की तुलना करें, पत्तियों की दोनों सतहें देखें।"],
  final: ["प्रभावित पौधों की संख्या लिखें और 48–72 घंटे में दोबारा देखें। नुकसान बढ़े तो कृषि अधिकारी को बुलाएँ।", "यह मॉडल की शुरुआती जाँच है, लैब की पुष्टि नहीं। कोई भी फसल सुरक्षा उत्पाद इस्तेमाल करने से पहले स्थानीय विशेषज्ञ और लेबल की सलाह मानें।"],
};
const careTe: typeof careHi = {
  uncertain: ["పగటి వెలుతురులో రెండు స్పష్టమైన ఫోటోలు తీయండి: మొత్తం మొక్క, ఆకు రెండు వైపుల దగ్గరి ఫోటోలు.", "ఇలాంటి లక్షణాలు ఒకే మొక్కపైనా లేదా చాలా మొక్కలపైనా ఉన్నాయా చూడండి. ఆరోగ్యమైన మొక్కతో పోల్చండి.", "వ్యాధి కోసం మందు వాడే ముందు వ్యవసాయ అధికారిని అడగండి. మార్పులను నమోదు చేయండి."],
  healthy: ["ఈ ఫోటోలో నమూనాకు స్పష్టమైన వ్యాధి లక్షణం కనిపించలేదు. కొన్ని రోజులకొకసారి కొత్త ఆకులను గమనించండి; ఆరోగ్యంగా కనిపించే ఒక్క ఫోటో ప్రారంభ వ్యాధిని పూర్తిగా తోసిపుచ్చదు."],
  blight: ["ఆకుమాడు వంటి లక్షణాలు కనిపించాయి. ముఖ్యంగా వర్షం తర్వాత పక్క మొక్కలపై వ్యాపించే గోధుమ మచ్చలను గమనించండి.", "వీలైతే ఆకులపై నేరుగా నీరు పోయకుండా చూడండి, గాలి తగిలేలా ఉంచండి, పడిపోయిన ఆకులను శుభ్రమైన పనిముట్లతో తొలగించండి. నష్టం పెరిగితే స్థానిక సలహా తీసుకోండి."],
  mildew: ["బూజు వంటి లక్షణాలు కనిపించాయి. ఆకుల రెండు వైపుల పొరలు లేదా రంగు మార్పులు చూడండి.", "మొక్కల మధ్య దూరం, గాలి ఉండేలా చూడండి. సాయంత్రం ఆకులు తడవకుండా ఉంచండి. మందుకు ముందు నిపుణుడిని అడగండి."],
  rust: ["తుప్పు వంటి లక్షణాలు కనిపించాయి. ఆకుల కింద నారింజ-గోధుమ రంగు బొబ్బలు ఉన్నాయా చూడండి.", "ఏ ఆకులకు వ్యాపించిందో నమోదు చేయండి. శిలీంద్రనాశిని వాడే ముందు స్థానిక నిర్ధారణ పొందండి."],
  spot: ["ఆకు మచ్చల వంటి సంకేతాలు కనిపించాయి. కొత్త మచ్చలను ఫోటో తీయండి; పోషక లోపం కూడా అలానే కనిపించవచ్చు.", "ప్రభావిత ఆకుల నీటి చినుకులు ఆరోగ్యమైన మొక్కలపై పడకుండా చూడండి. కారణాన్ని నిపుణుడితో నిర్ధారించండి."],
  virus: ["వైరస్ వంటి ఆకు ముడత లేదా రంగు మార్పు కనిపించింది. కొత్త ఆకులు, వాటి కింద పేనుబంక లేదా తెల్లదోమ ఉన్నాయా చూడండి.", "వీలైతే ప్రభావిత మొక్కలను వేరుగా ఉంచండి. మొక్కను తొలగించే ముందు నిపుణుడిని అడగండి; పురుగుమందులు వైరస్‌ను నయం చేయవు."],
  wilt: ["మొక్క వాడిపోవడానికి నీటి కొరత, నీరు నిల్వ ఉండటం, వేడి లేదా వ్యాధి కారణం కావచ్చు. నేల తేమ, కాండం పరిశీలించండి."],
  other: ["ఈ ఫోటో పంట ఆరోగ్య సమస్యను సూచిస్తోంది. ప్రభావిత, ఆరోగ్యమైన మొక్కలను పోల్చి ఆకుల రెండు వైపుల పరిశీలించండి."],
  final: ["ప్రభావిత మొక్కల సంఖ్యను నమోదు చేసి 48–72 గంటల తర్వాత మళ్లీ చూడండి. నష్టం పెరిగితే వ్యవసాయ అధికారిని సంప్రదించండి.", "ఇది నమూనా ఆధారిత ప్రాథమిక పరిశీలన మాత్రమే; ప్రయోగశాల నిర్ధారణ కాదు. ఏ పంట రక్షణ ఉత్పత్తినైనా వాడే ముందు స్థానిక నిపుణుడి సలహా, లేబుల్ సూచనలు పాటించండి."],
};
export function localizedCareSteps(diagnosis: Diagnosis, language: Language): string[] {
  if (language === "en") return buildCropCareSteps(diagnosis);
  const s = language === "hi" ? careHi : careTe;
  const label = (diagnosis.predicted_label ?? "").toLowerCase().replaceAll("_", " ");
  const uncertain = diagnosis.is_uncertain || diagnosis.status !== "analyzed" || diagnosis.inference_mode !== "onnx_model" || diagnosis.confidence === null || diagnosis.confidence < .7 || /(unsupported|mismatch|quality|coverage)/.test(label);
  if (uncertain) return [...s.uncertain];
  let kind: keyof typeof careHi = "other";
  if (/healthy/.test(label)) kind = "healthy";
  else if (/blight/.test(label)) kind = "blight";
  else if (/mildew/.test(label)) kind = "mildew";
  else if (/rust/.test(label)) kind = "rust";
  else if (/bacterial|spot|scab|septoria|cercospora/.test(label)) kind = "spot";
  else if (/mosaic|virus|curl|yellow leaf/.test(label)) kind = "virus";
  else if (/wilt/.test(label)) kind = "wilt";
  return [...s[kind], ...s.final];
}
