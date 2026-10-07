import type { AdminDraftOrder } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { logger, safeStringify } from "@/utils/logger";
import type { CartItem } from "@/types/utils";

type DraftLine = NonNullable<AdminDraftOrder["items"]>[number];

type DraftItemUpdate = {
  id: string;
  quantity: number;
  unit_price: CartItem["unit_price"];
  metadata: Record<string, unknown> | null;
};

type DraftItemsDiff = {
  add: CartItem[];
  update: DraftItemUpdate[];
  /** Draft line ids to zero out. */
  remove: string[];
};

/** Stable across key order, so a reordered object is not mistaken for a change. */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort())
      : val
  );

/** What has to change on the draft for its lines to match the cart, matched by variant. */
const diffDraftItems = (draftLines: DraftLine[], cartItems: CartItem[]): DraftItemsDiff => {
  // Medusa types a draft line's variant as nullable and a cart item's as optional.
  const draftByVariant = new Map(draftLines.map((line) => [line.variant_id ?? "", line]));
  const cartVariants = new Set(cartItems.map((item) => item.variant_id ?? ""));

  const add: CartItem[] = [];
  const update: DraftItemUpdate[] = [];

  for (const item of cartItems) {
    const line = draftByVariant.get(item.variant_id ?? "");
    if (!line) {
      add.push(item);
      continue;
    }
    // Comments and discounts live in metadata; without comparing it they are lost on park.
    const changed =
      line.quantity !== item.quantity ||
      line.unit_price !== item.unit_price ||
      stableStringify(line.metadata ?? {}) !== stableStringify(item.metadata ?? {});
    if (changed) {
      update.push({
        id: line.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        metadata: (item.metadata as Record<string, unknown> | undefined) ?? null,
      });
    }
  }

  const remove = draftLines
    .filter((line) => !cartVariants.has(line.variant_id ?? ""))
    .map((line) => line.id);

  return { add, update, remove };
};

/**
 * The metadata to send so the draft ends up as `next`. Medusa merges metadata and only
 * deletes a key sent as "", so every key that disappeared is sent that way.
 */
const metadataUpdate = (
  current: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>
): Record<string, unknown> => {
  const update: Record<string, unknown> = { ...next };
  for (const key of Object.keys(current ?? {})) {
    if (!(key in next)) update[key] = "";
  }
  return update;
};

/** Opens an edit on the draft unless one is already pending; edits fail without it. */
const beginEditIfNeeded = async (draftOrderId: string): Promise<void> => {
  const sdk = getSdk();
  try {
    const { order_changes } = await sdk.admin.order.listChanges(draftOrderId);
    if (!order_changes.some((change) => change.status === "pending")) {
      await sdk.admin.draftOrder.beginEdit(draftOrderId);
    }
  } catch (error) {
    // The update that follows reports the real failure if the edit is truly missing.
    void logger.error(`beginEditIfNeeded: ${safeStringify(error)}`);
  }
};

/**
 * The customer behind an email, created if missing — what Medusa does itself when a
 * draft is created from an email alone. Used because a draft's customer cannot be cleared.
 */
const resolveCustomerIdByEmail = async (email: string): Promise<string> => {
  const sdk = getSdk();
  const { customers } = await sdk.admin.customer.list({ email, limit: 1 });
  if (customers[0]) return customers[0].id;
  const { customer } = await sdk.admin.customer.create({ email });
  return customer.id;
};

export {
  stableStringify,
  diffDraftItems,
  metadataUpdate,
  beginEditIfNeeded,
  resolveCustomerIdByEmail,
};
export type { DraftItemsDiff, DraftItemUpdate };
