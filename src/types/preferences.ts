export type DateTimePreferences = {
  dateFormat: "system" | "DD.MM.YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
  timeFormat: "system" | "24h" | "12h";
};

export type DisplayPreferences = {
  startFullscreen: boolean;
};

export type CurrencyPreferences = {
  symbolPosition: "before" | "after";
  decimalSeparator: "dot" | "comma";
};

export type ThemeMode = "light" | "dark" | "system";

export type AppearancePreferences = {
  themeMode: ThemeMode;
};

export type LanguageMode = "en" | "ka" | "pl" | "es" | "fr" | "de" | "sv" | "system";

export type IntegrationPreferences = {
  customEndpointsEnabled: boolean;
};

export type UserPreferences = {
  dateTime: DateTimePreferences;
  display: DisplayPreferences;
  currency: CurrencyPreferences;
  appearance: AppearancePreferences;
  integration: IntegrationPreferences;
  language: LanguageMode;
};
