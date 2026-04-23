import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ka from "./locales/ka.json";
import pl from "./locales/pl.json";

export type SupportedLocale = "en" | "ka" | "pl";
const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "ka", "pl"];

export function resolveLocale(mode: string): SupportedLocale {
  if (mode !== "system") {
    return SUPPORTED_LOCALES.includes(mode as SupportedLocale)
      ? (mode as SupportedLocale)
      : "en";
  }
  const browser = navigator.language.toLowerCase();
  for (const locale of SUPPORTED_LOCALES) {
    if (browser.startsWith(locale)) return locale;
  }
  return "en";
}

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ka: { translation: ka },
    pl: { translation: pl },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18next };
export { useTranslation } from "react-i18next";
export const t = i18next.t.bind(i18next);
