import { en, type TranslationKey } from "./locales/en";
import { hi } from "./locales/hi";
import { te } from "./locales/te";
import type { Language } from "@/features/preferences/preferences";
export function t(key: TranslationKey, language: Language): string {
  return (language === "hi" ? hi : language === "te" ? te : en)[key];
}
export type { TranslationKey };
