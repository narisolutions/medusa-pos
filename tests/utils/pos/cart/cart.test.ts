import { describe, it, expect } from "vitest";
import type { AdminProductVariant } from "@medusajs/types";
import { variantHasPrice } from "@/utils/pos/cart";

type PriceFields = Pick<AdminProductVariant, "calculated_price" | "prices">;
const variant = (fields: Partial<PriceFields>) => fields as PriceFields;

describe("variantHasPrice", () => {
  it("trusts the price Medusa calculated for the till's currency", () => {
    expect(variantHasPrice(variant({ calculated_price: { calculated_amount: 14.99 } as PriceFields["calculated_price"] }))).toBe(true);
    expect(variantHasPrice(variant({ calculated_price: { calculated_amount: 0 } as PriceFields["calculated_price"] }))).toBe(true);
  });

  it("treats a missing calculated price as no price, never as 0", () => {
    expect(variantHasPrice(variant({ calculated_price: null as unknown as PriceFields["calculated_price"], prices: [] }))).toBe(false);
    expect(
      variantHasPrice(variant({ calculated_price: { calculated_amount: null } as unknown as PriceFields["calculated_price"] }))
    ).toBe(false);
  });

  it("falls back to listed prices only when the catalogue carries no calculated price", () => {
    expect(variantHasPrice(variant({ prices: [{ amount: 10 }] as PriceFields["prices"] }))).toBe(true);
    expect(variantHasPrice(variant({ prices: [] }))).toBe(false);
    expect(variantHasPrice(variant({}))).toBe(false);
  });
});
