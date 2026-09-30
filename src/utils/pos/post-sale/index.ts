import type { AdminOrder } from "@medusajs/types";
import { toNumber } from "@/utils/pos/pricing";

export type PostSaleKind = "return" | "exchange" | "add";

/** Why an option is unavailable; each maps to `orders.post_sale.reason_<key>`. */
export type PostSaleBlock =
  | "canceled"
  | "open_change"
  | "unpaid"
  | "not_fulfilled"
  | "all_returned"
  | "no_stock_location";

export type PostSaleOption = { enabled: true } | { enabled: false; reason: PostSaleBlock };

type ItemDetail = {
  fulfilled_quantity?: unknown;
  return_requested_quantity?: unknown;
  return_received_quantity?: unknown;
  return_dismissed_quantity?: unknown;
};

/**
 * Units of a line that can still come back. The backend only subtracts returns
 * still *requested*, so the POS must subtract received and dismissed ones too (spike S8).
 */
export function getReturnableQuantity(item: { detail?: ItemDetail | null }): number {
  const d = item.detail ?? {};
  return Math.max(
    0,
    toNumber(d.fulfilled_quantity) -
      toNumber(d.return_requested_quantity) -
      toNumber(d.return_received_quantity) -
      toNumber(d.return_dismissed_quantity)
  );
}

const UNPAID = new Set(["not_paid", "awaiting", "authorized", "partially_authorized", "requires_action", "canceled"]);

/**
 * Which post-sale operations this order allows, each with a reason when not.
 * Nothing is hidden — the chooser shows the reason instead.
 */
export function getPostSaleOptions(
  order: Pick<AdminOrder, "status" | "payment_status"> & {
    items?: { detail?: ItemDetail | null }[] | null;
  },
  context: { hasOpenChange: boolean; hasStockLocation: boolean }
): Record<PostSaleKind, PostSaleOption> {
  const all = (reason: PostSaleBlock) => ({
    return: { enabled: false, reason },
    exchange: { enabled: false, reason },
    add: { enabled: false, reason },
  } as const);

  if (order.status === "canceled") return all("canceled");
  if (context.hasOpenChange) return all("open_change");

  const items = order.items ?? [];
  const goodsBack: PostSaleOption = UNPAID.has(order.payment_status ?? "")
    ? { enabled: false, reason: "unpaid" }
    : !items.some((i) => toNumber(i.detail?.fulfilled_quantity) > 0)
      ? { enabled: false, reason: "not_fulfilled" }
      : !items.some((i) => getReturnableQuantity(i) > 0)
        ? { enabled: false, reason: "all_returned" }
        : !context.hasStockLocation
          ? { enabled: false, reason: "no_stock_location" }
          : { enabled: true };

  return { return: goodsBack, exchange: goodsBack, add: { enabled: true } };
}

/** The entry button shows when anything is possible, or when an open change explains why not. */
export function showPostSaleEntry(options: Record<PostSaleKind, PostSaleOption>): boolean {
  return Object.values(options).some(
    (o) => o.enabled || o.reason === "open_change"
  );
}
