import { toNumber } from "@/utils/pos/pricing";

// When Medusa refuses a sale it says so in its own words: "Some variant does not have the
// required inventory" (which one?), "Not enough stock available for item iitem_… at location
// sloc_…". These turn that text into the lines the cashier sees in the cart, and why.

type RefusalLine = {
  variantId?: string | null;
  title?: string | null;
  productTitle?: string | null;
  quantity: number;
};

type StockShort = { name: string; requested: number; available: number | null };

type Refusal =
  | { kind: "not_for_sale"; names: string[] }
  | { kind: "no_price"; names: string[] }
  | { kind: "not_stocked_here"; names: string[] }
  /** `lines` is empty when Medusa refused for stock but no line can be singled out. */
  | { kind: "short_stock"; lines: StockShort[] };

type RefusalContext = {
  lines: RefusalLine[];
  /** Live stock per variant; null when it couldn't be loaded, so no numbers are shown. */
  availability?: Map<string, number> | null;
  /** Inventory item id → the variant using it, for messages that name only the inventory item. */
  inventoryItemVariant?: Map<string, string>;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

const NOT_FOR_SALE = /Variants (.+?) do not exist or belong to a product that is not published/;
const NO_PRICE = /Variants with IDs (.+?) do not have a price/;
const NOT_STOCKED_NO_ITEMS = /Variant (variant_[0-9A-Z]{26}) does not have any inventory items associated/;
const NOT_STOCKED_NO_LOCATION =
  /Sales channel \S+ is not associated with any stock location for variant (variant_[0-9A-Z]{26})/;
const SHORT_FOR_ITEM = /Not enough stock available for item (iitem_[0-9A-Z]{26}) at location/;
const SHORT_UNNAMED = /does not have the required inventory/i;

type CartLike = { variant_id?: string | null; title?: string | null; quantity?: unknown; metadata?: unknown };
type OrderLineLike = {
  variant_id?: string | null;
  title?: string | null;
  product_title?: string | null;
  quantity?: unknown;
};

/** The cart's lines, as the refusal helpers read them. */
const cartLines = (items: readonly CartLike[]): RefusalLine[] =>
  items.map((item) => ({
    variantId: item.variant_id,
    title: item.title,
    productTitle: (item.metadata as { product_title?: string } | null | undefined)?.product_title,
    quantity: toNumber(item.quantity),
  }));

/** An order's lines, as the refusal helpers read them. */
const orderLines = (items: readonly OrderLineLike[] | null | undefined): RefusalLine[] =>
  (items ?? []).map((item) => ({
    variantId: item.variant_id,
    title: item.title,
    productTitle: item.product_title,
    quantity: toNumber(item.quantity),
  }));

/** What the cashier calls a line: the product, plus the variant when that tells them apart. */
const lineName = (line: RefusalLine): string => {
  // Medusa's "Default variant" names no variant, so it isn't worth a word.
  const variant = line.title?.trim() === "Default variant" ? undefined : line.title?.trim();
  const product = line.productTitle?.trim();
  if (product && variant && variant !== product && !variant.includes(product)) return `${product} · ${variant}`;
  return variant || product || "-";
};

const nameOf = (id: string, lines: RefusalLine[]): string => {
  const line = lines.find((candidate) => candidate.variantId === id);
  return line ? lineName(line) : id;
};

const idList = (list: string): string[] => list.split(",").map((id) => id.trim()).filter(Boolean);

type ProductLike = {
  variants?: { id: string; inventory_items?: { inventory_item_id?: string | null }[] | null }[] | null;
};

/** Inventory item id → variant, so a message naming only the inventory item can find its line. */
const inventoryItemVariants = (products: readonly ProductLike[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      for (const link of variant.inventory_items ?? []) {
        if (link.inventory_item_id) map.set(link.inventory_item_id, variant.id);
      }
    }
  }
  return map;
};

/** True for the refusals that need live stock to be explained. */
const needsLiveStock = (message: string): boolean => SHORT_FOR_ITEM.test(message) || SHORT_UNNAMED.test(message);

/** Reads Medusa's refusal text; null for any other error. */
function explainRefusal(message: string, context: RefusalContext): Refusal | null {
  const { lines, availability = null, inventoryItemVariant } = context;

  const notForSale = NOT_FOR_SALE.exec(message);
  if (notForSale) return { kind: "not_for_sale", names: idList(notForSale[1]).map((id) => nameOf(id, lines)) };

  const noPrice = NO_PRICE.exec(message);
  if (noPrice) return { kind: "no_price", names: idList(noPrice[1]).map((id) => nameOf(id, lines)) };

  const notStocked = NOT_STOCKED_NO_ITEMS.exec(message) ?? NOT_STOCKED_NO_LOCATION.exec(message);
  if (notStocked) return { kind: "not_stocked_here", names: [nameOf(notStocked[1], lines)] };

  const shortItem = SHORT_FOR_ITEM.exec(message);
  if (shortItem) {
    const variantId = inventoryItemVariant?.get(shortItem[1]);
    const line = variantId ? lines.find((candidate) => candidate.variantId === variantId) : undefined;
    if (!line || !variantId) return { kind: "short_stock", lines: [] };
    return {
      kind: "short_stock",
      lines: [{ name: lineName(line), requested: line.quantity, available: availability?.get(variantId) ?? null }],
    };
  }

  if (SHORT_UNNAMED.test(message)) {
    // Medusa doesn't say which: the lines asking for more than there is now are the ones.
    const short = availability
      ? lines
          .filter((line) => line.variantId && line.quantity > (availability.get(line.variantId) ?? 0))
          .map((line) => ({
            name: lineName(line),
            requested: line.quantity,
            available: availability.get(line.variantId as string) ?? 0,
          }))
      : [];
    return { kind: "short_stock", lines: short };
  }

  return null;
}

/** The refusal as one sentence for a toast, in the till's language. */
function refusalMessage(refusal: Refusal, t: Translate): string {
  switch (refusal.kind) {
    case "not_for_sale":
      return t("checkout.items_not_for_sale", { count: refusal.names.length, names: refusal.names.join(", ") });
    case "no_price":
      return t("checkout.refusal.no_price", { names: refusal.names.join(", ") });
    case "not_stocked_here":
      return t("checkout.refusal.not_stocked_here", { names: refusal.names.join(", ") });
    case "short_stock": {
      if (refusal.lines.length === 0) return t("checkout.refusal.short_generic");
      const details = refusal.lines
        .map((line) =>
          line.available === null
            ? line.name
            : t("checkout.refusal.short_line", {
                name: line.name,
                requested: line.requested,
                available: line.available,
              })
        )
        .join("; ");
      return t("checkout.refusal.short_stock", { details });
    }
  }
}

export { cartLines, explainRefusal, inventoryItemVariants, lineName, needsLiveStock, orderLines, refusalMessage };
export type { Refusal, RefusalContext, RefusalLine };
