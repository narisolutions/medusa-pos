import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ka from "./locales/ka.json";
import pl from "./locales/pl.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import sv from "./locales/sv.json";

export type SupportedLocale = "en" | "ka" | "pl" | "es" | "fr" | "de" | "sv";
const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "ka", "pl", "es", "fr", "de", "sv"];

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

const resources = { en, ka, pl, es, fr, de, sv };

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: Object.fromEntries(
      Object.entries(resources).map(([lng, translation]) => [lng, { translation }])
    ),
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
} else {
  Object.entries(resources).forEach(([lng, translation]) => {
    if (!i18next.hasResourceBundle(lng, "translation")) {
      i18next.addResourceBundle(lng, "translation", translation);
    }
  });
}

export { i18next };
export { useTranslation } from "react-i18next";
export const t = i18next.t.bind(i18next);
