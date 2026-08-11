import { describe, it, expect } from "vitest";
import { AdminOrder } from "@medusajs/types";
import { buildHandoffPayload, toMinorUnits } from ".";
import schemas from "@/utils/schemas";

/** A completed transfer order, shaped like what the orders API returns. */
const order = {
  id: "order_01KZNZ96K8KN5CAJ040GNQ487J",
  display_id: 501,
  currency_code: "gel",
  items: [
    {
      id: "ordli_01",
      title: "Tsinandali 2019, Shumi",
      variant_sku: "wine-tsinandali-2019",
      variant_id: "variant_01",
      product_type: "restriction:18+",
      quantity: 2,
      unit_price: 45,
      tax_lines: [{ rate: 18 }],
      metadata: { vintage: "2019" },
    },
  ],
} as unknown as AdminOrder;

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
});

describe("buildHandoffPayload", () => {
  it("produces a payload the contract schema accepts", () => {
    const payload = buildHandoffPayload(order);
    expect(schemas.handoffPayload.safeParse(payload).success).toBe(true);
  });

  it("maps a wine line to the contract fields", () => {
    const [item] = buildHandoffPayload(order).items;

    expect(item.sku).toBe("wine-tsinandali-2019");
    expect(item.name).toBe("Tsinandali 2019, Shumi");
    expect(item.qty).toBe(2);
    expect(item.priceTetri).toBe(4500);
    expect(item.vatBp).toBe(1800);
    expect(item.minimumAge).toBe(18);
    expect(item.meta).toEqual({ vintage: "2019" });
  });

  it("uses the order id as ref so a reprint is idempotent", () => {
    const first = buildHandoffPayload(order);
    const second = buildHandoffPayload(order);

    expect(first.ref).toBe("order_01KZNZ96K8KN5CAJ040GNQ487J");
    expect(second.ref).toBe(first.ref);
  });

  it("upper-cases the currency", () => {
    expect(buildHandoffPayload(order).currency).toBe("GEL");
  });

  it("falls back to variant_id when the variant has no sku", () => {
    const noSku = {
      ...order,
      items: [{ ...(order.items ?? [])[0], variant_sku: null }],
    } as unknown as AdminOrder;

    expect(buildHandoffPayload(noSku).items[0].sku).toBe("variant_01");
  });

  it("omits optional fields rather than sending nulls", () => {
    const bare = {
      ...order,
      items: [
        {
          id: "ordli_02",
          title: "Cheese plate",
          variant_sku: "cheese-plate",
          quantity: 1,
          unit_price: 12,
        },
      ],
    } as unknown as AdminOrder;

    const [item] = buildHandoffPayload(bare).items;
    expect(item).not.toHaveProperty("vatBp");
    expect(item).not.toHaveProperty("minimumAge");
    expect(item).not.toHaveProperty("meta");
    expect(schemas.handoffPayload.safeParse(buildHandoffPayload(bare)).success).toBe(true);
  });

  it("reads the age restriction only from a matching product_type", () => {
    const unrestricted = {
      ...order,
      items: [{ ...(order.items ?? [])[0], product_type: "wine" }],
    } as unknown as AdminOrder;

    expect(buildHandoffPayload(unrestricted).items[0].minimumAge).toBeUndefined();
  });
});
