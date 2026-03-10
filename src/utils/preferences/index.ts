import type { UserPreferences } from "@/types/preferences";
import storage from "@/utils/storage";
import { DEFAULT_PREFERENCES } from "./defaults";

export { DEFAULT_PREFERENCES } from "./defaults";
export { applyBootPreferences } from "./boot";

export {
  initDateTimePrefs,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  previewDateTime,
} from "./datetime";

export {
  initCurrencyPrefs,
  formatPrice,
  formatCurrencyRaw,
  getCurrencySymbol,
} from "./currency";

function deepMerge(defaults: UserPreferences, partial: Partial<UserPreferences>): UserPreferences {
  return {
    dateTime: { ...defaults.dateTime, ...partial.dateTime },
    display: { ...defaults.display, ...partial.display },
    currency: { ...defaults.currency, ...partial.currency },
  };
}

type LegacyDateTimePreferences = {
  dateFormat: "system" | "DD.MM.YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
  timeFormat: "system" | "24h" | "12h";
};

export async function loadPreferences(): Promise<UserPreferences> {
  const existing = await storage.getItem<UserPreferences>("user_preferences");
  if (existing) return deepMerge(DEFAULT_PREFERENCES, existing);

  const legacy = await storage.getItem<LegacyDateTimePreferences>("date_time_preferences");
  const migrated = deepMerge(DEFAULT_PREFERENCES, legacy ? { dateTime: legacy } : {});

  await storage.setItem("user_preferences", migrated);
  if (legacy) await storage.removeItem("date_time_preferences");

  return migrated;
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await storage.setItem("user_preferences", prefs);
}

export async function updatePreferences(
  patch: Partial<UserPreferences>
): Promise<UserPreferences> {
  const current = await loadPreferences();
  const merged = deepMerge(current, patch);
  await savePreferences(merged);
  return merged;
}
