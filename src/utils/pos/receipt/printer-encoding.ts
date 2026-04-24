import profiles from "../printer-profiles.json";

export type PrinterEncoding = "ascii" | "utf8" | "cp852";

const CP852_MAP = profiles.cp852.map as Record<string, string>;

/**
 * Sanitizes a string for ESC/POS thermal printing according to the printer's
 * configured character encoding.
 *
 * - "ascii"  (default): strips all non-ASCII — identical to the original
 *   sanitizeItemTitle behavior. Safe for any printer regardless of firmware.
 * - "utf8":  only strips raw ESC/POS control bytes; all Unicode passes through.
 *   Requires printer firmware with UTF-8 support.
 * - "cp852": applies an explicit character mapping table for Central European
 *   characters (Polish, Czech, etc.) before stripping anything unmapped.
 */
export function sanitizePrinterString(
  text: string,
  encoding: PrinterEncoding = "ascii"
): string {
  if (!text) return "";

  if (encoding === "utf8") {
    return text
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (encoding === "cp852") {
    const mapped = text
      .split("")
      .map((ch) => {
        if (CP852_MAP[ch] !== undefined) return CP852_MAP[ch];
        if (ch.charCodeAt(0) > 127) {
          console.warn(`[receipt] cp852: unmapped char U+${ch.charCodeAt(0).toString(16).padStart(4, "0")} '${ch}' replaced with '?'`);
          return "?";
        }
        return ch;
      })
      .join("");

    return mapped
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // "ascii" — identical to original sanitizeItemTitle; do not change this path
  const normalized = text.normalize("NFD");
  return normalized
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
