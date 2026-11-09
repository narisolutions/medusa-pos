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


/** ISO 4217 decimals of a currency (GEL 2, JPY 0, KWD 3); 2 when unknown. */
function currencyExponent(currency?: string | null): number {
  if (!currency) return 2;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/**
 * Decimal major units → integer minor units of `currency`: the one place this app converts.
 * Sum money in minor units, where float drift can't creep in. Must round, not truncate:
 * 4.5 * 100 is 450.00000000000006 in IEEE-754.
 */
function toMinorUnits(amount: number, currency?: string | null): number {
  return Math.round(toNumber(amount) * 10 ** currencyExponent(currency));
}

/** Integer minor units of `currency` → decimal major units, for display and storage. */
function fromMinorUnits(minor: number, currency?: string | null): number {
  return minor / 10 ** currencyExponent(currency);
}

export {
  toNumber,
  discountPerUnit,
  applyDiscountToUnitPrice,
  currencyExponent,
  toMinorUnits,
  fromMinorUnits,
};
