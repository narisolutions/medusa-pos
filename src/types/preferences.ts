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

/**
 * Barcode scanner input. `wedge` is the default: the scanner types keystrokes
 * and a document-level listener picks them up. `serial` opens the scanner's
 * Virtual COM port instead and reads bytes — immune to keyboard layout, not
 * dependent on focus, and the only path that can read alphanumeric or 2D codes.
 * Stored per-terminal; a scanner has to be switched to COM mode on the device.
 */
export type ScannerTransport = "wedge" | "serial";

export type ScannerPreferences = {
  transport: ScannerTransport;
  /**
   * Port to open. Prefer the OS's stable identifier where one exists — on Linux
   * `ttyUSB0` is assigned in enumeration order, so a replug can move it.
   */
  port?: string;
  baud: number;
  /**
   * Silence-based framing for a scanner that sends no terminator, in ms.
   * 0 = terminator-only, which is the normal path; anything else costs that
   * latency on every scan.
   */
  idleMs: number;
};

export type UserPreferences = {
  dateTime: DateTimePreferences;
  display: DisplayPreferences;
  currency: CurrencyPreferences;
  appearance: AppearancePreferences;
  language: LanguageMode;
  register: RegisterPreferences;
  scanner: ScannerPreferences;
};
