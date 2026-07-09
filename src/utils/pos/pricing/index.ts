import { OrderDiscount } from "@/types/utils";

/**
 * Single home for the POS discount rules. Cart slices, the payment dialog,
 * receipts and item dialogs must all derive prices through these functions —
 * a drift between two hand-rolled copies of this math is a till-doesn't-balance
 * bug, so do not re-implement it at call sites.
 *
 * Conventions encoded here:
 * - "percent" discounts are a percentage of the base price; "amount" discounts
 *   are an absolute value in the order currency.
 * - A discount never exceeds the base it applies to (clamped), and a
 *   discounted price is never negative.
 */

/** Per-unit discount amount for a manual item discount, clamped to the base unit price. */
const discountPerUnit = (
  discount: NonNullable<OrderDiscount>,
  baseUnitPrice: number
): number => {
  const raw =
    discount.type === "percent"
      ? (baseUnitPrice * discount.value) / 100
      : discount.value;
  return Math.min(raw, baseUnitPrice);
};

/** Unit price after applying a manual item discount (never negative). */
const applyDiscountToUnitPrice = (
  discount: OrderDiscount | undefined,
  baseUnitPrice: number
): number => {
  if (!discount || discount.value <= 0) return baseUnitPrice;
  return Math.max(0, baseUnitPrice - discountPerUnit(discount, baseUnitPrice));
};

/**
 * Order-level discount amount against the current total (post item discounts).
 * "amount" discounts clamp to the total; "percent" is taken of the total.
 */
const orderDiscountAmount = (
  discount: OrderDiscount | undefined,
  currentTotal: number
): number => {
  if (!discount || !discount.value) return 0;
  return discount.type === "percent"
    ? (currentTotal * discount.value) / 100
    : Math.min(discount.value, currentTotal);
};

export { discountPerUnit, applyDiscountToUnitPrice, orderDiscountAmount };
