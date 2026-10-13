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
 * The shipping option the order actually left with: its newest fulfillment that
 * wasn't cancelled. Staff may pick another option when fulfilling than the one
 * chosen at checkout.
 */
function getFulfilledShippingOptionName(order: AdminOrder): string | null {
  const live = (order.fulfillments ?? []).filter((f) => !f.canceled_at);
  const newest = live.sort((a, b) => Date.parse(String(b.created_at)) - Date.parse(String(a.created_at)))[0] as
    | { shipping_option?: { name?: string | null } | null }
    | undefined;
  return newest?.shipping_option?.name ?? null;
}

/**
 * Classify an order's shipping method by the name of how it left (or, before
 * fulfilment, how it was ordered), checking for "pickup"-like keywords.
 */
function classifyOrderShippingMethod(order: AdminOrder): FulfillmentClassification {
  const name = getShippingMethodLabel(order)?.toLowerCase() ?? "";

  const isPickup = name.includes("pickup") || name.includes("in-store") || name.includes("in store");

  return {
    type: isPickup ? "pickup" : "shipping",
    isPickup,
    isShipping: !isPickup,
  };
}

/** The shipping method to show: the fulfilled option when there is one, else the one chosen at checkout. */
function getShippingMethodLabel(order: AdminOrder): string | null {
  const method = order.shipping_methods?.[0] as
    | { name?: string }
    | undefined;

  return getFulfilledShippingOptionName(order) ?? method?.name ?? null;
}

/** The store's pickup option, else the first — an order needs a shipping method even at a counter. */
function pickPickupOption<T extends { name?: string | null }>(options: T[] | null | undefined): T | undefined {
  return options?.find((o) => o.name?.toLowerCase().includes("pickup")) ?? options?.[0];
}

export {
  pickPickupOption,
  classifyFulfillment,
  classifyOrderShippingMethod,
  getShippingMethodLabel,
};
export type { FulfillmentType, FulfillmentClassification };
