import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

export type SupportedLocale = "en" | "ka" | "pl" | "es" | "fr" | "de" | "sv";
const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "ka", "pl", "es", "fr", "de", "sv"];

// Only `en` ships in the entry bundle (fallback + synchronous `t`); the rest are
// chunks fetched on demand, so a terminal parses one locale instead of seven.
const LOCALE_LOADERS: Record<
  Exclude<SupportedLocale, "en">,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  ka: () => import("./locales/ka.json"),
  pl: () => import("./locales/pl.json"),
  es: () => import("./locales/es.json"),
  fr: () => import("./locales/fr.json"),
  de: () => import("./locales/de.json"),
  sv: () => import("./locales/sv.json"),
};

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

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
} else if (!i18next.hasResourceBundle("en", "translation")) {
  i18next.addResourceBundle("en", "translation", en);
}

async function loadLocale(locale: SupportedLocale): Promise<void> {
  if (locale === "en" || i18next.hasResourceBundle(locale, "translation")) return;
  const { default: translation } = await LOCALE_LOADERS[locale]();
  i18next.addResourceBundle(locale, "translation", translation);
}

/** Resolves a preference value ("system" or a locale), loads it, then switches. */
export async function setLocale(mode: string): Promise<SupportedLocale> {
  const locale = resolveLocale(mode);
  await loadLocale(locale);
  await i18next.changeLanguage(locale);
  return locale;
}

export { i18next };
export { useTranslation } from "react-i18next";
export const t = i18next.t.bind(i18next);
