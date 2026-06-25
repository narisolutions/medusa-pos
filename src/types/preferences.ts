export type DateTimePreferences = {
  dateFormat: "system" | "DD.MM.YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
  timeFormat: "system" | "24h" | "12h";
};

export type DisplayPreferences = {
  startFullscreen: boolean;
};

/**
 * Cash rounding (a.k.a. Swedish rounding) for markets that have withdrawn small
 * coins. Applies to **cash tenders only** — card/other tenders stay exact. Off by
 * default. When on, the cash total is rounded to `increment` so it matches the
 * physical drawer (and keeps register reconciliation free of stray cents).
 */
export type CashRounding = {
  enabled: boolean;
  /** Rounding step in display units (e.g. 0.05 = nearest 5 cents). */
  increment: number;
};

export type CurrencyPreferences = {
  symbolPosition: "before" | "after";
  decimalSeparator: "dot" | "comma";
  cashRounding: CashRounding;
};

export type ThemeMode = "light" | "dark" | "system";

export type AppearancePreferences = {
  themeMode: ThemeMode;
};

export type LanguageMode = "en" | "ka" | "pl" | "es" | "fr" | "de" | "sv" | "system";

/**
 * Cash-reconciliation (register) settings. Optional feature, OFF by default.
 * Stored per-terminal. When `enabled` is false the whole feature is dormant.
 */
export type RegisterPreferences = {
  enabled: boolean;
  /** Business-day boundary, 0–23 (0 = midnight). Late-night sales stay in one shift. */
  dayCutoffHour: number;
  /** |over/short| above this (display units) requires a reason at close. */
  discrepancyThreshold: number;
  /** Whether closing the register requires the manager PIN. */
  requirePinToClose: boolean;
  /** SHA-256 hex hash of the manager PIN. The raw PIN is never stored. */
  managerPinHash?: string;
};

export type UserPreferences = {
  dateTime: DateTimePreferences;
  display: DisplayPreferences;
  currency: CurrencyPreferences;
  appearance: AppearancePreferences;
  language: LanguageMode;
  register: RegisterPreferences;
};
