import { AdminDraftOrder, AdminProduct } from "@medusajs/types";
import { CartItem, DraftOrderMetadata, OrderDiscount, PaymentMethod } from "@/types/utils";
import { isEmpty } from "@/utils/helpers";

const DEFAULT_DRAFT_ORDER_METADATA: DraftOrderMetadata = {
  order_discount: null,
  order_comment: "",
};

/** Order-level metadata keys the POS owns and normalizes. Anything else is passed through. */
const POS_OWNED_METADATA_KEYS = [
  "order_discount",
  "order_comment",
  "park_label",
  "payment_method",
] as const;

type SanitizeOptions = {
  /** Writing to the API: emit only keys with real values, no defaults. */
  removeEmpty?: boolean;
  /** Existing remote metadata whose unknown keys must survive the write. */
  preserve?: Record<string, unknown> | null;
};

/**
 * Normalizes the order-level metadata keys the POS owns.
 *
 * Unknown keys (cash_paid, register_session_id, pay_later, …) are written by other parts
 * of the app and MUST survive: rebuilding the object from a fixed allowlist erases them.
 */
const sanitizeDraftOrderMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  { removeEmpty = false, preserve }: SanitizeOptions = {}
): DraftOrderMetadata => {
  const orderDiscount = metadata?.order_discount as OrderDiscount | undefined;
  const orderComment = metadata?.order_comment;
  const parkLabel = metadata?.park_label;
  const paymentMethod = metadata?.payment_method;

  const passthrough: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(preserve ?? {})) {
    if (!POS_OWNED_METADATA_KEYS.includes(key as (typeof POS_OWNED_METADATA_KEYS)[number])) {
      passthrough[key] = value;
    }
  }

  if (removeEmpty) {
    const sanitized: Record<string, unknown> = { ...passthrough };

    if (!isEmpty(orderDiscount)) {
      sanitized.order_discount = orderDiscount;
    }

    if (typeof orderComment === "string" && orderComment.trim() !== "") {
      sanitized.order_comment = orderComment;
    }

    if (typeof parkLabel === "string" && parkLabel.trim() !== "") {
      sanitized.park_label = parkLabel.trim();
    }

    // Persisted so a parked sale resumes with the cashier's selection intact. The
    // provider is still recorded on the payment session at capture time; this is
    // only the UI selection, and nothing on the backend reads it.
    if (typeof paymentMethod === "string" && paymentMethod !== "") {
      sanitized.payment_method = paymentMethod;
    }

    return sanitized as DraftOrderMetadata;
  }

  const normalized: Record<string, unknown> = {
    ...passthrough,
    order_discount:
      typeof orderDiscount === "object" || orderDiscount === null
        ? (orderDiscount as OrderDiscount | null)
        : DEFAULT_DRAFT_ORDER_METADATA.order_discount,
    order_comment:
      typeof orderComment === "string"
        ? orderComment
        : DEFAULT_DRAFT_ORDER_METADATA.order_comment,
    ...(typeof parkLabel === "string" && parkLabel !== "" && { park_label: parkLabel }),
    ...(typeof paymentMethod === "string" && paymentMethod !== "" && {
      payment_method: paymentMethod,
    }),
  };

  return normalized as DraftOrderMetadata;
};

/**
 * Maps a draft order's line items back into cart items.
 *
 * Item metadata is copied WHOLESALE, never allowlisted. Everything on it is written by
 * this app (buildItemMetadata), and an allowlist here fails silently when it drifts out
 * of step with the writer — it has already lost options, original_unit_price and
 * inventory_item_ids once. See docs/draft-orders/04-state-and-persistence.md.
 */
const mapDraftOrderItemsToCartItems = (draftOrder: AdminDraftOrder): CartItem[] =>
  (draftOrder.items || []).map((item) => ({
    variant_id: item.variant_id ?? "",
    quantity: item.quantity,
    unit_price: item.unit_price,
    title:
      item.title ||
      item.variant_title ||
      (item.metadata?.product_title as string | undefined) ||
      "-",
    metadata: { ...(item.metadata ?? {}) },
  }));

/**
 * Builds cart metadata from a draft.
 *
 * `availableMethodIds` guards the restored payment method: a sale parked at another
 * till may name a provider this one does not offer, which would leave the guard
 * satisfied while no button appears selected.
 *
 * `guestEmail`: a draft needs an email, so an anonymous sale carries the store's guest
 * customer — that is no customer at all, and resumes as none.
 */
const buildCartMetadataFromDraft = (
  draftOrder: AdminDraftOrder,
  fallbackPaymentMethod?: PaymentMethod,
  availableMethodIds?: string[],
  guestEmail?: string
): DraftOrderMetadata => {
  const metadata = sanitizeDraftOrderMetadata(
    draftOrder.metadata as Record<string, unknown> | null
  ) as Record<string, unknown>;

  const isGuest =
    !!guestEmail && draftOrder.email?.toLowerCase() === guestEmail.toLowerCase();
  if (!isGuest) {
    if (draftOrder.customer_id) metadata.customer_id = draftOrder.customer_id;
    if (draftOrder.email) metadata.customer_email = draftOrder.email;
  }

  const stored = metadata.payment_method as string | undefined;
  const isOffered =
    !availableMethodIds ||
    (!!stored &&
      availableMethodIds.some((id) => id.toLowerCase() === stored.toLowerCase()));

  metadata.payment_method = (stored && isOffered ? stored : fallbackPaymentMethod) as
    | string
    | undefined;

  return metadata as DraftOrderMetadata;
};

type StockClass = "ok" | "reduced" | "unavailable";

type StockWarning = {
  variantId: string;
  title: string;
  requested: number;
  available: number;
  status: Exclude<StockClass, "ok">;
};

type ReconcileStockResult = {
  items: CartItem[];
  warnings: StockWarning[];
};

/**
 * Refreshes each line's availability snapshot against live stock.
 *
 * Quantities are never clamped: the cashier agreed this sale with a customer, so the job
 * is to report what changed, not to silently rewrite the order.
 */
const reconcileStock = (
  items: CartItem[],
  availability: Map<string, number>
): ReconcileStockResult => {
  const warnings: StockWarning[] = [];

  const reconciled = items.map((item) => {
    const variantId = item.variant_id ?? "";
    // A variant missing from the catalogue is gone from this channel, not merely unknown.
    const available = availability.get(variantId) ?? 0;

    if (item.quantity > available) {
      warnings.push({
        variantId,
        title: item.title || "-",
        requested: item.quantity,
        available,
        status: available === 0 ? "unavailable" : "reduced",
      });
    }

    return {
      ...item,
      metadata: { ...(item.metadata ?? {}), available_quantity: available },
    };
  });

  return { items: reconciled, warnings };
};

/**
 * Stock per variant from the catalogue. Null for an empty catalogue: that is a failed
 * load, and reading it as "nothing in stock" would mark every line unavailable.
 */
const availabilityFromProducts = (
  products: AdminProduct[] | null | undefined
): Map<string, number> | null => {
  if (!products?.length) return null;
  const map = new Map<string, number>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (typeof variant.inventory_quantity === "number") {
        map.set(variant.id, variant.inventory_quantity);
      }
    }
  }
  return map;
};

const VARIANT_ID = /variant_[0-9A-Z]{26}/g;
const UNSELLABLE = /^Variants (.+) do not exist or belong to a product that is not published/;

const cartItemName = (items: CartItem[], variantId: string): string => {
  const item = items.find((candidate) => candidate.variant_id === variantId);
  return item?.title || (item?.metadata?.product_title as string | undefined) || variantId;
};

/** The cart lines Medusa refused because their product is no longer published, by name. */
const unsellableItemNames = (message: string, items: CartItem[]): string[] | null => {
  const match = UNSELLABLE.exec(message);
  if (!match) return null;
  return match[1].split(", ").map((id) => cartItemName(items, id.trim()));
};

/** A backend message with the cart's variant ids replaced by what the operator sees. */
const nameVariantIds = (message: string, items: CartItem[]): string =>
  message.replace(VARIANT_ID, (id) => cartItemName(items, id));

export {
  availabilityFromProducts,
  nameVariantIds,
  unsellableItemNames,
  DEFAULT_DRAFT_ORDER_METADATA,
  sanitizeDraftOrderMetadata,
  mapDraftOrderItemsToCartItems,
  buildCartMetadataFromDraft,
  reconcileStock,
};
export type { StockWarning, ReconcileStockResult };
