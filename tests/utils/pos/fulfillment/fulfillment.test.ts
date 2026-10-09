import { describe, it, expect } from "vitest";
import { AdminOrder } from "@medusajs/types";
import { classifyOrderShippingMethod, getShippingMethodLabel } from "@/utils/pos/fulfillment";

const order = (fields: Record<string, unknown>) => fields as unknown as AdminOrder;
const ordered = { shipping_methods: [{ name: "QuickShipper Shipping" }] };
const fulfilment = (name: string, created_at: string, canceled_at: string | null = null) => ({
  created_at,
  canceled_at,
  shipping_option: { name },
});

describe("getShippingMethodLabel", () => {
  it("shows the option chosen at checkout until the order is fulfilled", () => {
    expect(getShippingMethodLabel(order(ordered))).toBe("QuickShipper Shipping");
  });

  it("shows the option the order was actually fulfilled with", () => {
    const fulfilled = order({ ...ordered, fulfillments: [fulfilment("Store pickup", "2026-10-07T09:20:00Z")] });
    expect(getShippingMethodLabel(fulfilled)).toBe("Store pickup");
    expect(classifyOrderShippingMethod(fulfilled).isPickup).toBe(true);
  });

  it("takes the newest fulfilment that wasn't cancelled", () => {
    const refulfilled = order({
      ...ordered,
      fulfillments: [
        fulfilment("Store pickup", "2026-10-07T09:00:00Z"),
        fulfilment("Courier", "2026-10-07T10:00:00Z"),
        fulfilment("Bike courier", "2026-10-07T11:00:00Z", "2026-10-07T11:05:00Z"),
      ],
    });
    expect(getShippingMethodLabel(refulfilled)).toBe("Courier");
  });

  it("falls back to the checkout option when a fulfilment carries no option", () => {
    const bare = order({ ...ordered, fulfillments: [{ created_at: "2026-10-07T09:00:00Z", canceled_at: null }] });
    expect(getShippingMethodLabel(bare)).toBe("QuickShipper Shipping");
  });
});
