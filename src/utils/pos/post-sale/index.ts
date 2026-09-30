import type { AdminOrder } from "@medusajs/types";
import { toNumber } from "@/utils/pos/pricing";

export type PostSaleKind = "return" | "exchange" | "add";

/** Why an option is unavailable; each maps to `orders.post_sale.reason_<key>`. */
export type PostSaleBlock =
  | "canceled"
  | "refunded"
  | "open_change"
  | "unpaid"
  | "not_fulfilled"
  | "all_returned"
  | "no_stock_location"
  | "currency";

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

/** Nothing captured yet — a pay-later sale still owed in full. */
export function isUnpaidStatus(status: string | null | undefined): boolean {
  return UNPAID.has(status ?? "");
}

/**
 * Which post-sale operations this order allows, each with a reason when not.
 * Nothing is hidden — the chooser shows the reason instead.
 */
export function getPostSaleOptions(
  order: Pick<AdminOrder, "status" | "payment_status"> & {
    currency_code?: string | null;
    items?: { detail?: ItemDetail | null }[] | null;
  },
  context: { hasOpenChange: boolean; hasStockLocation: boolean; tillCurrency?: string | null }
): Record<PostSaleKind, PostSaleOption> {
  const all = (reason: PostSaleBlock) => ({
    return: { enabled: false, reason },
    exchange: { enabled: false, reason },
    add: { enabled: false, reason },
  } as const);

  if (order.status === "canceled") return all("canceled");
  // A fully refunded sale is reversed: nothing is left to refund against, and a new purchase belongs at checkout.
  if (order.payment_status === "refunded") return all("refunded");
  if (context.hasOpenChange) return all("open_change");

  const items = order.items ?? [];
  const goodsBack: PostSaleOption = isUnpaidStatus(order.payment_status)
    ? { enabled: false, reason: "unpaid" }
    : !items.some((i) => toNumber(i.detail?.fulfilled_quantity) > 0)
      ? { enabled: false, reason: "not_fulfilled" }
      : !items.some((i) => getReturnableQuantity(i) > 0)
        ? { enabled: false, reason: "all_returned" }
        : !context.hasStockLocation
          ? { enabled: false, reason: "no_stock_location" }
          : { enabled: true };

  // The picker prices goods in this till's currency; on an order in another one
  // the numbers would be wrong and the backend rejects the lines anyway.
  const goodsOut: PostSaleOption =
    context.tillCurrency &&
    order.currency_code &&
    context.tillCurrency.toLowerCase() !== order.currency_code.toLowerCase()
      ? { enabled: false, reason: "currency" }
      : { enabled: true };

  return {
    return: goodsBack,
    exchange: goodsBack.enabled ? goodsOut : goodsBack,
    add: goodsOut,
  };
}

/**
 * The entry button shows unless the order is dead (canceled, fully refunded):
 * a greyed-out option with its reason tells the cashier more than no button.
 */
export function showPostSaleEntry(options: Record<PostSaleKind, PostSaleOption>): boolean {
  return Object.values(options).some(
    (o) => o.enabled || (o.reason !== "canceled" && o.reason !== "refunded")
  );
}

/** Who settles, never a bare signed number: a cashier can misread −30.00, not a sentence. */
export function differenceDirection(amount: number): "pays" | "refund" | "even" {
  const cents = Math.round(amount * 100);
  return cents > 0 ? "pays" : cents < 0 ? "refund" : "even";
}

/** Stamped on the edits Add items opens, so the timeline can tell them from checkout's. */
export const POST_SALE_EDIT_DESCRIPTION = "pos:add_items";

type ChangeAction = { action?: string | null; details?: Record<string, unknown> | null };
type ChangeLike = {
  id: string;
  change_type?: string | null;
  description?: string | null;
  status?: string | null;
  confirmed_at?: string | Date | null;
  actions?: ChangeAction[] | null;
};
type ActivityLine = { title: string; quantity: number };

export type PostSaleEvent =
  | { id: string; kind: "items_added"; at: string; lines: ActivityLine[]; amount: number }
  | { id: string; kind: "items_returned"; at: string; restocked: number; damaged: number; lines: ActivityLine[] }
  | { id: string; kind: "items_exchanged"; at: string; out: ActivityLine[]; back: ActivityLine[] };

const iso = (d: string | Date) => (typeof d === "string" ? d : d.toISOString());

/**
 * Timeline events for post-sale changes, from the backend's own change log.
 * Edits confirmed before `saleCompletedAt` built the original sale at checkout
 * and are not post-sale additions.
 */
export function postSaleEvents(
  changes: ChangeLike[],
  items: { id: string; title?: string | null }[],
  saleCompletedAt: string | Date | null
): PostSaleEvent[] {
  const titles = new Map(items.map((i) => [i.id, i.title ?? "-"]));
  const cutoff = saleCompletedAt ? new Date(saleCompletedAt).getTime() : null;
  const linesFor = (actions: ChangeAction[], names: string[]): ActivityLine[] =>
    actions
      .filter((a) => names.includes(a.action ?? ""))
      .map((a) => ({
        title: titles.get(String(a.details?.reference_id ?? "")) ?? "-",
        quantity: toNumber(a.details?.quantity),
      }));

  const events: PostSaleEvent[] = [];
  for (const change of changes) {
    if (change.status !== "confirmed" || !change.confirmed_at) continue;
    const at = iso(change.confirmed_at);
    const actions = change.actions ?? [];

    if (change.change_type === "edit") {
      // Our own edits carry the stamp; for anyone else's, after the sale completed is the best guess.
      const stamped = change.description === POST_SALE_EDIT_DESCRIPTION;
      if (!stamped && (cutoff === null || new Date(at).getTime() <= cutoff)) continue;
      const added = actions.filter((a) => a.action === "ITEM_ADD");
      if (added.length === 0) continue;
      events.push({
        id: change.id,
        kind: "items_added",
        at,
        lines: linesFor(added, ["ITEM_ADD"]),
        amount: added.reduce(
          (sum, a) => sum + toNumber(a.details?.quantity) * toNumber(a.details?.unit_price),
          0
        ),
      });
    } else if (change.change_type === "return_receive") {
      const count = (name: string) =>
        actions.filter((a) => a.action === name).reduce((s, a) => s + toNumber(a.details?.quantity), 0);
      events.push({
        id: change.id,
        kind: "items_returned",
        at,
        restocked: count("RECEIVE_RETURN_ITEM"),
        damaged: count("RECEIVE_DAMAGED_RETURN_ITEM"),
        lines: linesFor(actions, ["RECEIVE_RETURN_ITEM", "RECEIVE_DAMAGED_RETURN_ITEM"]),
      });
    } else if (change.change_type === "exchange") {
      events.push({
        id: change.id,
        kind: "items_exchanged",
        at,
        out: linesFor(actions, ["ITEM_ADD"]),
        back: linesFor(actions, ["RETURN_ITEM"]),
      });
    }
  }
  return events;
}

/** Per line: how many come back sellable and how many damaged. Nothing is assumed. */
export type ReturnSelection = Record<string, { restock: number; damaged: number }>;

/**
 * The return's backend calls from the cashier's choices: everything is
 * requested, then restocked lines are received and damaged ones dismissed.
 */
export function buildReturnPlan(selection: ReturnSelection) {
  const entries = Object.entries(selection).filter(([, s]) => s.restock + s.damaged > 0);
  return {
    request: entries.map(([id, s]) => ({ id, quantity: s.restock + s.damaged })),
    receive: entries.filter(([, s]) => s.restock > 0).map(([id, s]) => ({ id, quantity: s.restock })),
    dismiss: entries.filter(([, s]) => s.damaged > 0).map(([id, s]) => ({ id, quantity: s.damaged })),
  };
}

type ReceiptLine = {
  quantity?: unknown;
  unit_price?: unknown;
  total?: unknown;
  discount_total?: unknown;
  detail?: ItemDetail | null;
};

/** Returned lines, or a second payment (added items, an exchange top-up). */
export function isChangedAfterSale(order: {
  items?: ReceiptLine[] | null;
  payment_collections?: unknown[] | null;
}): boolean {
  return (
    (order.payment_collections?.length ?? 0) > 1 ||
    (order.items ?? []).some(
      (i) =>
        toNumber(i.detail?.return_received_quantity) + toNumber(i.detail?.return_dismissed_quantity) > 0
    )
  );
}

/** What the customer still has: each line less what came back, empty lines dropped. */
export function netOfReturns<T extends ReceiptLine>(items: T[]): T[] {
  return items.flatMap((item) => {
    const sold = toNumber(item.quantity);
    const back =
      toNumber(item.detail?.return_received_quantity) + toNumber(item.detail?.return_dismissed_quantity);
    const kept = sold - back;
    if (kept <= 0) return [];
    if (back === 0) return [item];
    const share = kept / sold;
    return [
      {
        ...item,
        quantity: kept,
        total: toNumber(item.unit_price) * kept,
        discount_total: toNumber(item.discount_total) * share,
      },
    ];
  });
}
