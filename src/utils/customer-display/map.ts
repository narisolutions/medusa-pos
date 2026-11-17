import type { CartItem, OrderDiscount } from "@/types/utils";
import type { DisplayLine, DisplayPaymentMethod, DisplayScreen, DisplayTotals } from "@/types/customer-display";
import { optionValuesText } from "@/utils/pos/catalog";
import { formatPrice } from "@/utils/settings/preferences/currency";
import { displayImageUrlSchema } from "@/utils/schemas/customer-display";

/** A long cart shows its newest lines; the totals still count every one. */
export const MAX_DISPLAY_LINES = 50;

type OptionValue = Parameters<typeof optionValuesText>[0];

/** The till's own figures, read from the cart's getters: the display never does its own sums. */
export type CartTotals = { itemCount: number; subtotal: number; discount: number; total: number };

export type CartView = { lines: DisplayLine[]; totals: DisplayTotals };

export type DisplayPayment = {
  method: DisplayPaymentMethod;
  /** The backend's figures, once it has priced the sale; the cart's stand in until then. */
  total?: number;
  amountDue?: number;
  roundedFrom?: number;
  tendered?: number;
  change?: number;
  vatIncluded?: number;
};

type PaymentOverlay = { kind: "payment"; cart: CartView } & DisplayPayment;

/** What sits over the cart: a payment in progress, or a result held for a few seconds. */
export type DisplayOverlay =
  | PaymentOverlay
  | { kind: "success"; total: number; change?: number; outstanding: boolean; until: number }
  | { kind: "failed"; total: number; until: number; resume?: PaymentOverlay };

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const imageUrl = (value: unknown): string | undefined =>
  displayImageUrlSchema.safeParse(value).success ? (value as string) : undefined;

function discountLabel(discount: OrderDiscount | undefined, currency: string): string | undefined {
  if (!discount || !(num(discount.value) ?? 0) || discount.value <= 0) return undefined;
  const label = discount.type === "percent" ? `−${discount.value}%` : `−${formatPrice(discount.value, currency)}`;
  return label.slice(0, 40);
}

/**
 * One cart line for the buyer, built field by field: the line's metadata also holds its
 * SKU, barcode, stock and the cashier's comment, and none of that may leave the till.
 */
function toDisplayLine(item: CartItem, options: { showImages: boolean; currency: string }): DisplayLine | null {
  const quantity = num(item.quantity) ?? 0;
  if (!item.variant_id || quantity <= 0) return null;
  const meta = item.metadata ?? {};
  const unitPrice = num(item.unit_price) ?? 0;
  const before = Math.max(num(meta.original_price) ?? 0, num(meta.original_unit_price) ?? 0);
  const subtitle = Array.isArray(meta.options) ? optionValuesText(meta.options as OptionValue) : "";
  const thumbnailUrl = options.showImages ? imageUrl(meta.thumbnail) : undefined;
  const label = discountLabel(meta.item_discount as OrderDiscount | undefined, options.currency);
  return {
    key: item.variant_id,
    title: String(item.title || meta.product_title || "").slice(0, 120),
    ...(subtitle ? { subtitle: subtitle.slice(0, 120) } : {}),
    quantity,
    unitPrice,
    ...(before > unitPrice ? { originalUnitPrice: before } : {}),
    // As the till's own cart row shows it.
    lineTotal: unitPrice * quantity,
    ...(label ? { discountLabel: label } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
  };
}

/** The cart as the buyer sees it: the lines, and the totals exactly as the till computed them. */
export function cartView(
  items: readonly CartItem[],
  totals: CartTotals,
  options: { showImages: boolean; currency: string }
): CartView {
  const all = items.flatMap((item) => toDisplayLine(item, options) ?? []);
  return {
    lines: all.slice(-MAX_DISPLAY_LINES),
    totals: {
      itemCount: Math.max(0, num(totals.itemCount) ?? 0),
      subtotal: num(totals.subtotal) ?? 0,
      discount: num(totals.discount) ?? 0,
      total: num(totals.total) ?? 0,
      hiddenLines: Math.max(0, all.length - MAX_DISPLAY_LINES),
    },
  };
}

/**
 * The overlay as it stands now: a result past its time drops away (a failure back to the
 * payment still open), and "thank you" ends for good the moment the next sale starts.
 */
export function settleOverlay(overlay: DisplayOverlay | null, cartIsEmpty: boolean, now: number): DisplayOverlay | null {
  if (!overlay || overlay.kind === "payment") return overlay;
  if (overlay.kind === "success") return now >= overlay.until || !cartIsEmpty ? null : overlay;
  return now >= overlay.until ? (overlay.resume ?? null) : overlay;
}

/** The screen for a settled overlay: a result, then a payment, then the cart; an empty cart is the welcome screen. */
export function buildScreen(cart: CartView, overlay: DisplayOverlay | null): DisplayScreen {
  if (overlay?.kind === "success") {
    return {
      phase: "payment_success",
      total: overlay.total,
      outstanding: overlay.outstanding,
      ...(overlay.change !== undefined ? { change: overlay.change } : {}),
    };
  }
  if (overlay?.kind === "failed") return { phase: "payment_failed", total: overlay.total };
  if (overlay?.kind === "payment") {
    const { cart: frozen, total, amountDue, vatIncluded, roundedFrom, tendered, change, method } = overlay;
    const due = total ?? frozen.totals.total;
    return {
      phase: "payment_pending",
      lines: frozen.lines,
      totals: {
        ...frozen.totals,
        total: due,
        ...(vatIncluded !== undefined && vatIncluded > 0 ? { vatIncluded } : {}),
      },
      method,
      amountDue: amountDue ?? due,
      ...(roundedFrom !== undefined ? { roundedFrom } : {}),
      ...(tendered !== undefined ? { tendered } : {}),
      ...(change !== undefined ? { change } : {}),
    };
  }
  if (cart.lines.length === 0) return { phase: "idle" };
  return { phase: "cart", lines: cart.lines, totals: cart.totals };
}
