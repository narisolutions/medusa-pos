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
    cashRounding: {
      enabled: false,
      increment: 0.05,
    },
  },
  appearance: {
    themeMode: "system",
  },
  language: "system",
  register: {
    enabled: false,
    dayCutoffHour: 0,
    discrepancyThreshold: 5,
    requirePinToClose: true,
  },
};
