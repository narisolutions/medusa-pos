import { describe, it, expect, beforeEach } from "vitest";
import { initCurrencyPrefs, roundCashAmount } from "@/utils/settings/preferences/currency";
import { DEFAULT_PREFERENCES } from "@/utils/settings/preferences/defaults";

const withRounding = (increment: number) =>
  initCurrencyPrefs({ ...DEFAULT_PREFERENCES.currency, cashRounding: { enabled: true, increment } });

describe("roundCashAmount", () => {
  beforeEach(() => initCurrencyPrefs({ ...DEFAULT_PREFERENCES.currency }));

  it("leaves cash exact while rounding is off", () => {
    expect(roundCashAmount(14.99)).toBe(14.99);
  });

  it("rounds half-up to the increment", () => {
    withRounding(0.05);
    expect(roundCashAmount(14.97)).toBe(14.95);
    expect(roundCashAmount(14.98)).toBe(15);
    expect(roundCashAmount(14.975)).toBe(15);
  });

  it("rounds a refund like a sale, half-up on the absolute value", () => {
    withRounding(0.05);
    expect(roundCashAmount(-14.975)).toBe(-15);
    expect(roundCashAmount(-14.97)).toBe(-14.95);
    expect(roundCashAmount(-0.025)).toBe(-0.05);
  });
});
