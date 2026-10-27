import { describe, it, expect } from "vitest";
import {
  toNumber,
  discountPerUnit,
  applyDiscountToUnitPrice,
  currencyExponent,
  toMinorUnits,
  fromMinorUnits,
} from "@/utils/pos/pricing";

describe("toNumber", () => {
  it("passes through finite numbers", () => {
    expect(toNumber(12.5)).toBe(12.5);
    expect(toNumber(0)).toBe(0);
    expect(toNumber(-3)).toBe(-3);
  });

  it("treats nullish and non-finite input as zero", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber(NaN)).toBe(0);
    expect(toNumber(Infinity)).toBe(0);
    expect(toNumber("not a number")).toBe(0);
  });

  it("parses Medusa's string amounts", () => {
    expect(toNumber("19.99")).toBe(19.99);
    expect(toNumber("0")).toBe(0);
  });

  it("unwraps BigNumber-like values", () => {
    expect(toNumber({ toNumber: () => 42 })).toBe(42);
    expect(toNumber({ valueOf: () => 7.5 })).toBe(7.5);
  });
});

describe("discountPerUnit", () => {
  it("computes a percentage of the base price", () => {
    expect(discountPerUnit({ type: "percent", value: 10 }, 100)).toBe(10);
    expect(discountPerUnit({ type: "percent", value: 33 }, 90)).toBeCloseTo(29.7);
  });

  it("uses a fixed value as-is", () => {
    expect(discountPerUnit({ type: "amount", value: 5 }, 20)).toBe(5);
  });

  it("clamps to the base price so a unit can never go negative", () => {
    expect(discountPerUnit({ type: "amount", value: 50 }, 20)).toBe(20);
    expect(discountPerUnit({ type: "percent", value: 150 }, 20)).toBe(20);
  });
});

describe("applyDiscountToUnitPrice", () => {
  it("returns the base price when there is no discount", () => {
    expect(applyDiscountToUnitPrice(undefined, 25)).toBe(25);
    expect(applyDiscountToUnitPrice({ type: "amount", value: 0 }, 25)).toBe(25);
  });

  it("ignores non-positive discount values", () => {
    expect(applyDiscountToUnitPrice({ type: "amount", value: -5 }, 25)).toBe(25);
  });

  it("subtracts percentage and fixed discounts", () => {
    expect(applyDiscountToUnitPrice({ type: "percent", value: 20 }, 50)).toBe(40);
    expect(applyDiscountToUnitPrice({ type: "amount", value: 15 }, 50)).toBe(35);
  });

  it("never returns a negative price", () => {
    expect(applyDiscountToUnitPrice({ type: "amount", value: 999 }, 10)).toBe(0);
    expect(applyDiscountToUnitPrice({ type: "percent", value: 300 }, 10)).toBe(0);
  });
});

describe("toMinorUnits", () => {
  it("rounds rather than truncating the IEEE-754 remainder", () => {
    // 4.5 * 100 is 450.00000000000006; truncation would bill 449 tetri.
    expect(toMinorUnits(4.5)).toBe(450);
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
  });

  it("cannot rescue a price that is already below the boundary in binary", () => {
    // 1.005 is stored as 1.00499999999999989…, so *100 lands at 100.4999…
    // and rounds down. Rounding cannot recover a digit the literal never had.
    // Harmless here: Medusa prices are two-decimal, so a third decimal never
    // reaches this function.
    expect(toMinorUnits(1.005)).toBe(100);
  });

  it("handles zero and Medusa's string amounts", () => {
    expect(toMinorUnits(0)).toBe(0);
    expect(toMinorUnits("32.50" as unknown as number)).toBe(3250);
  });

  it("uses the currency's own decimals, as the hand-off contract asks", () => {
    expect(toMinorUnits(45, "GEL")).toBe(4500);
    expect(toMinorUnits(1200, "jpy")).toBe(1200);
    expect(toMinorUnits(1.234, "KWD")).toBe(1234);
  });
});

describe("currencyExponent", () => {
  it("reads ISO 4217 decimals, and assumes two when it cannot tell", () => {
    expect(currencyExponent("GEL")).toBe(2);
    expect(currencyExponent("JPY")).toBe(0);
    expect(currencyExponent("KWD")).toBe(3);
    expect(currencyExponent(undefined)).toBe(2);
    expect(currencyExponent("not-a-currency")).toBe(2);
  });
});

describe("fromMinorUnits", () => {
  it("turns minor units back into the currency's major units", () => {
    expect(fromMinorUnits(13227)).toBe(132.27);
    expect(fromMinorUnits(1200, "JPY")).toBe(1200);
    expect(fromMinorUnits(1234, "KWD")).toBe(1.234);
  });
});
