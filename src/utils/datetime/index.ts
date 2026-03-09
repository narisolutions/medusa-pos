import type { DateTimePreferences } from "@/types/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/preferences/defaults";

export type { DateTimePreferences };

const defaults = DEFAULT_PREFERENCES.dateTime;

let _prefs: DateTimePreferences = { ...defaults };

export const initDateTimePrefs = (prefs: DateTimePreferences): void => {
  _prefs = prefs;
};

const isInvalidInput = (date: Date | string): boolean => {
  if (!date) return true;
  if (date instanceof Date) return isNaN(date.getTime());
  const str = date.trim();
  if (str === "") return true;
  if (
    str === "0000-00-00" ||
    str === "0000-00-00 00:00:00" ||
    str === "null" ||
    str === "undefined"
  )
    return true;
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) || parsed.getTime() < 0;
};

const toDate = (date: Date | string): Date =>
  date instanceof Date ? date : new Date(date);

const formatDateStr = (d: Date, prefs: DateTimePreferences = _prefs): string => {
  if (prefs.dateFormat === "system") {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
  const year = d.getFullYear().toString();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  switch (prefs.dateFormat) {
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "DD.MM.YYYY":
    default:
      return `${day}.${month}.${year}`;
  }
};

const formatTimeStr = (d: Date, prefs: DateTimePreferences = _prefs): string => {
  switch (prefs.timeFormat) {
    case "system":
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    case "12h":
      return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    case "24h":
    default: {
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }
  }
};

export const formatDateTime = (date: Date | string): string => {
  if (isInvalidInput(date)) return "Invalid Date";
  const d = toDate(date);
  return `${formatDateStr(d)} ${formatTimeStr(d)}`;
};

export const formatDateOnly = (date: Date | string): string => {
  if (isInvalidInput(date)) return "Invalid Date";
  return formatDateStr(toDate(date));
};

export const formatTimeOnly = (date: Date | string): string => {
  if (isInvalidInput(date)) return "Invalid Date";
  return formatTimeStr(toDate(date));
};

// Preview helper — formats using provided prefs without touching the singleton
export const previewDateTime = (prefs: DateTimePreferences): string => {
  const now = new Date();
  return `${formatDateStr(now, prefs)} ${formatTimeStr(now, prefs)}`;
};
