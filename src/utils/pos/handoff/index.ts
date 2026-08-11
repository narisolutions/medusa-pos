import { AdminOrder } from "@medusajs/types";
import { HandoffItem, HandoffPayload } from "@/types/handoff";
import { toNumber } from "@/utils/pos/pricing";

/** Matches the `restriction:18+` convention carried in Medusa's product_type. */
const AGE_RESTRICTION_PATTERN = /restriction:(\d+)\+/;

/**
 * Decimal major units → integer minor units. The ONLY place this app converts;
 * everything else holds money in display units. Must round, not truncate:
 * 4.5 * 100 is 450.00000000000006 in IEEE-754.
 */
export function toMinorUnits(amount: number): number {
  return Math.round(toNumber(amount) * 100);
}

/** Minimum serving age from `product_type`, or undefined when unrestricted. */
function minimumAge(productType: unknown): number | undefined {
  if (typeof productType !== "string") return undefined;
  const match = AGE_RESTRICTION_PATTERN.exec(productType);
  if (!match) return undefined;
  const years = Number.parseInt(match[1], 10);
  return Number.isFinite(years) && years > 0 ? years : undefined;
}

/** VAT rate in basis points from the item's first tax line (18% → 1800). */
function vatBasisPoints(item: OrderLineItem): number | undefined {
  const rate = item.tax_lines?.[0]?.rate;
  if (rate === undefined || rate === null) return undefined;
  return Math.round(toNumber(rate) * 100);
}

/** Display-only extras Tamada shows on the line detail. */
function itemMeta(item: OrderLineItem): Record<string, unknown> | undefined {
  const metadata = item.metadata as Record<string, unknown> | null | undefined;
  const vintage = metadata?.vintage;
  return typeof vintage === "string" && vintage ? { vintage } : undefined;
}

/** The subset of a Medusa line item this builder reads. */
type OrderLineItem = NonNullable<AdminOrder["items"]>[number] & {
  variant_sku?: string | null;
  product_type?: string | null;
  tax_lines?: { rate?: number | string | null }[] | null;
};

/**
 * A completed transfer order → the ticket's QR payload.
 *
 * `ref` is the order id, which makes the payload deterministic: a reprint
 * carries the same ref, and Tamada refuses the duplicate scan rather than
 * charging the guest twice.
 */
export function buildHandoffPayload(order: AdminOrder): HandoffPayload {
  const items = ((order.items ?? []) as OrderLineItem[]).map((item): HandoffItem => {
    const meta = itemMeta(item);
    const age = minimumAge(item.product_type);
    const vatBp = vatBasisPoints(item);

    return {
      // variant_id is the fallback identity: sku is optional in Medusa but the
      // line id on Tamada's side has to be stable.
      sku: item.variant_sku || item.variant_id || item.id,
      name: item.title ?? "",
      qty: Math.max(1, Math.round(toNumber(item.quantity))),
      // Prices are tax-inclusive here and the contract wants gross of VAT.
      priceTetri: toMinorUnits(toNumber(item.unit_price)),
      ...(vatBp !== undefined ? { vatBp } : {}),
      ...(age !== undefined ? { minimumAge: age } : {}),
      ...(meta ? { meta } : {}),
    };
  });

  return {
    v: 1,
    src: "medusa",
    ref: order.id,
    ts: new Date().toISOString(),
    currency: (order.currency_code ?? "").toUpperCase(),
    items,
  };
}
