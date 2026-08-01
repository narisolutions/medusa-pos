import { describe, it, expect } from "vitest";
import {
  toNumber,
  discountPerUnit,
  applyDiscountToUnitPrice,
  orderDiscountAmount,
} from ".";

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

describe("orderDiscountAmount", () => {
  it("returns zero without a usable discount", () => {
    expect(orderDiscountAmount(undefined, 100)).toBe(0);
    expect(orderDiscountAmount({ type: "amount", value: 0 }, 100)).toBe(0);
  });

  it("computes a percentage of the running total", () => {
    expect(orderDiscountAmount({ type: "percent", value: 10 }, 250)).toBe(25);
  });

  it("clamps a fixed discount to the total", () => {
    expect(orderDiscountAmount({ type: "amount", value: 40 }, 100)).toBe(40);
    expect(orderDiscountAmount({ type: "amount", value: 400 }, 100)).toBe(100);
  });

  // Percent is deliberately unclamped — a >100% order discount is a data error
  // upstream, and silently clamping it would hide that from the operator.
  it("does not clamp percentage discounts above the total", () => {
    expect(orderDiscountAmount({ type: "percent", value: 150 }, 100)).toBe(150);
  });
});
