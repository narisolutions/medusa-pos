import type { CurrencyPreferences } from "@/types/preferences";
import { DEFAULT_PREFERENCES } from "./defaults";
import constants from "@/utils/constants";

export type { CurrencyPreferences };

let _prefs: CurrencyPreferences = { ...DEFAULT_PREFERENCES.currency };

export const initCurrencyPrefs = (prefs: CurrencyPreferences): void => {
  _prefs = prefs;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  GEL: "₾",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  INR: "₹",
  TRY: "₺",
  RUB: "₽",
  UAH: "₴",
  PLN: "zł",
  CHF: "CHF",
  CAD: "CA$",
  AUD: "A$",
  BRL: "R$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  CZK: "Kč",
  ILS: "₪",
  THB: "฿",
};

export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] ?? currencyCode.toUpperCase();
};

const applyDecimalSeparator = (formatted: string, sep: CurrencyPreferences["decimalSeparator"]): string => {
  if (sep === "comma") {
    return formatted.replace(".", ",");
  }
  return formatted;
};

/**
 * Main UI formatter — returns symbol-decorated string like "₾10.50" or "10,50 ₾".
 * Reads symbol position and decimal separator from persisted preferences.
 */
export const formatPrice = (
  amount: number,
  currencyCode: string = constants.CHECKOUT_CONFIG.CURRENCY,
): string => {
  const rounded = Math.round(amount * 100) / 100;
  const isNegative = rounded < 0;
  const abs = Math.abs(rounded);
  const numStr = applyDecimalSeparator(abs.toFixed(2), _prefs.decimalSeparator);
  const symbol = getCurrencySymbol(currencyCode);

  let result: string;
  if (_prefs.symbolPosition === "after") {
    result = `${numStr} ${symbol}`;
  } else {
    result = `${symbol}${numStr}`;
  }

  return isNegative ? `-${result}` : result;
};

/**
 * Receipt/plain-text formatter — uses the currency CODE (not symbol) for thermal printers
 * that may not support special Unicode characters. Respects decimal separator preference.
 */
export const formatCurrencyRaw = (
  amount: number,
  currencyCode: string = constants.CHECKOUT_CONFIG.CURRENCY,
): string => {
  const rounded = Math.round(amount * 100) / 100;
  const isNegative = rounded < 0;
  const abs = Math.abs(rounded);
  const numStr = applyDecimalSeparator(abs.toFixed(2), _prefs.decimalSeparator);
  const code = currencyCode.toUpperCase();

  const result = `${numStr} ${code}`;
  return isNegative ? `-${result}` : result;
};
