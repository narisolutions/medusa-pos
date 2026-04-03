import { AdminOrder, AdminOrderFulfillment } from "@medusajs/types";

type FulfillmentType = "pickup" | "shipping";

interface FulfillmentClassification {
  type: FulfillmentType;
  isPickup: boolean;
  isShipping: boolean;
}

/**
 * Classify a fulfillment as "pickup" or "shipping" using generic Medusa signals.
 *
 * Heuristics (in priority order):
 * 1. Provider ID contains "internal" → pickup (Medusa's built-in manual provider)
 * 2. Otherwise → shipping (external fulfillment provider)
 */
function classifyFulfillment(
  fulfillment: AdminOrderFulfillment
): FulfillmentClassification {
  const record = fulfillment as unknown as Record<string, unknown>;
  const provider = record.provider as { id?: string } | undefined;
  const providerId = provider?.id?.toLowerCase() ?? "";

  const isPickup = providerId.includes("internal");

  return {
    type: isPickup ? "pickup" : "shipping",
    isPickup,
    isShipping: !isPickup,
  };
}

/**
 * Classify an order's shipping method from the order-level shipping_methods array.
 * Falls back to checking the method name for "pickup"-like keywords.
 */
function classifyOrderShippingMethod(order: AdminOrder): FulfillmentClassification {
  const method = order.shipping_methods?.[0] as
    | { name?: string; shipping_option_id?: string }
    | undefined;

  const name = method?.name?.toLowerCase() ?? "";

  const isPickup = name.includes("pickup") || name.includes("in-store") || name.includes("in store");

  return {
    type: isPickup ? "pickup" : "shipping",
    isPickup,
    isShipping: !isPickup,
  };
}

/**
 * Get a clean display label for a shipping method.
 * Uses the API-provided name directly, with title-casing as fallback.
 */
function getShippingMethodLabel(order: AdminOrder): string | null {
  const method = order.shipping_methods?.[0] as
    | { name?: string }
    | undefined;

  return method?.name ?? null;
}

export {
  classifyFulfillment,
  classifyOrderShippingMethod,
  getShippingMethodLabel,
};
export type { FulfillmentType, FulfillmentClassification };
