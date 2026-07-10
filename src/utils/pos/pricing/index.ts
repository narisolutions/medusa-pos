import { OrderDiscount } from "@/types/utils";

// Single home for POS discount math — never re-implement at call sites (drift here is a
// till-doesn't-balance bug). Discounts clamp to their base; prices never go negative.

/** Coerces Medusa numeric values (number | string | BigNumber-like) to a finite number. */
const toNumber = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof val === "object") {
    const record = val as Record<string, unknown>;
    if (typeof record.toNumber === "function") {
      return toNumber((record.toNumber as () => unknown)());
    }
    const primitive = (record as { valueOf(): unknown }).valueOf();
    if (primitive !== val) return toNumber(primitive);
  }
  const coerced = Number(val);
  return Number.isFinite(coerced) ? coerced : 0;
};

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

/** Order-level discount amount against the current total (post item discounts). */
const orderDiscountAmount = (
  discount: OrderDiscount | undefined,
  currentTotal: number
): number => {
  if (!discount || !discount.value) return 0;
  return discount.type === "percent"
    ? (currentTotal * discount.value) / 100
    : Math.min(discount.value, currentTotal);
};

export { toNumber, discountPerUnit, applyDiscountToUnitPrice, orderDiscountAmount };
