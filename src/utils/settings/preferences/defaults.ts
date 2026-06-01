import type { UserPreferences } from "@/types/preferences";

export const DEFAULT_PREFERENCES: UserPreferences = {
  dateTime: {
    dateFormat: "DD.MM.YYYY",
    timeFormat: "24h",
  },
  display: {
    startFullscreen: true,
  },
  currency: {
    symbolPosition: "before",
    decimalSeparator: "dot",
  },
  appearance: {
    themeMode: "system",
  },
  language: "system",
};
