import type {
  UserPreferences,
  DateTimePreferences,
  DisplayPreferences,
  CurrencyPreferences,
  AppearancePreferences,
  RegisterPreferences,
  ScannerPreferences,
  LanguageMode,
} from "@/types/preferences";
import storage from "@/utils/storage";
import { logger, safeStringify } from "@/utils/logger";
import { DEFAULT_PREFERENCES } from "./defaults";

/** A patch that may touch any subset of any preferences section. */
export type PreferencesPatch = {
  dateTime?: Partial<DateTimePreferences>;
  display?: Partial<DisplayPreferences>;
  currency?: Partial<CurrencyPreferences>;
  appearance?: Partial<AppearancePreferences>;
  language?: LanguageMode;
  register?: Partial<RegisterPreferences>;
  scanner?: Partial<ScannerPreferences>;
};

export { DEFAULT_PREFERENCES } from "./defaults";
export { applyBootPreferences } from "./boot";

export {
  initDateTimePrefs,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
} from "./datetime";

export {
  initCurrencyPrefs,
  formatPrice,
  formatCurrencyRaw,
  getCurrencySymbol,
  getCashRounding,
  roundCashAmount,
} from "./currency";

function deepMerge(defaults: UserPreferences, partial: PreferencesPatch): UserPreferences {
  return {
    dateTime: { ...defaults.dateTime, ...partial.dateTime },
    display: { ...defaults.display, ...partial.display },
    currency: { ...defaults.currency, ...partial.currency },
    appearance: { ...defaults.appearance, ...partial.appearance },
    language: partial.language ?? defaults.language,
    register: { ...defaults.register, ...partial.register },
    scanner: { ...defaults.scanner, ...partial.scanner },
  };
}

type LegacyDateTimePreferences = {
  dateFormat: "system" | "DD.MM.YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
  timeFormat: "system" | "24h" | "12h";
};

/** Throws if the store cannot be read, so a bad read is never mistaken for a first run. */
async function readPreferences(): Promise<UserPreferences> {
  const existing = await storage.getItemOrThrow<UserPreferences>("user_preferences");
  if (existing) return deepMerge(DEFAULT_PREFERENCES, existing);

  const legacy = await storage.getItemOrThrow<LegacyDateTimePreferences>("date_time_preferences");
  if (!legacy) return DEFAULT_PREFERENCES;

  const migrated = deepMerge(DEFAULT_PREFERENCES, { dateTime: legacy });
  await storage.setItem("user_preferences", migrated);
  await storage.removeItem("date_time_preferences");

  return migrated;
}

export async function loadPreferences(): Promise<UserPreferences> {
  try {
    return await readPreferences();
  } catch (error) {
    // Defaults are for this session only — persisting them would wipe real settings.
    void logger.error(`Failed to read preferences: ${safeStringify(error)}`);
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await storage.setItem("user_preferences", prefs);
}

export async function updatePreferences(
  patch: PreferencesPatch
): Promise<UserPreferences> {
  // Deliberately not `loadPreferences` — failing loudly beats saving a patch on top
  // of defaults and overwriting everything the operator had configured.
  const current = await readPreferences();
  const merged = deepMerge(current, patch);
  await savePreferences(merged);
  return merged;
}
