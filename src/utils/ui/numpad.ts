export type NumpadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "backspace" | "clear";

/**
 * The value after one key press. A leading 0 is replaced, "." starts as "0." and appears
 * once, and `maxDecimals` (2 for money) stops further digits after the point. `replace` makes the
 * key start a new value, for a prefilled one the operator types over.
 */
export function applyNumpadKey(
  value: string,
  key: NumpadKey,
  options: { allowDecimal?: boolean; maxDecimals?: number; replace?: boolean } = {}
): string {
  const { allowDecimal = true, maxDecimals, replace = false } = options;
  if (replace) value = "";
  if (key === "backspace") return value.slice(0, -1);
  if (key === "clear") return "";
  if (key === ".") {
    if (!allowDecimal || value.includes(".")) return value;
    return value && value !== "0" ? `${value}.` : "0.";
  }
  const point = value.indexOf(".");
  if (point !== -1 && maxDecimals !== undefined && value.length - point - 1 >= maxDecimals) return value;
  return value === "0" ? key : value + key;
}
