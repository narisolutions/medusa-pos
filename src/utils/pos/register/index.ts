import { toNumber } from "@/utils/pos/pricing";
import { AdminOrder, AdminStore } from "@medusajs/types";
import { getMethodType } from "@/utils/settings/store/metadata";
import { getOrderPaymentMethodType } from "@/utils/pos/payment";
import type { RegisterSession } from "@/types/register";

/**
 * Cash-reconciliation helpers. Pure and (mostly) backend-agnostic — the only
 * Medusa-aware seam is `orderCashContribution`, which reads payment collections.
 * See src/docs/cash-reconciliation/09-portability.md.
 */

/**
 * Stable business-day key ("YYYY-MM-DD") for a timestamp, shifted by `cutoffHour`
 * so late-night sales stay in the same shift. With cutoffHour=4, 1am counts as the
 * previous business day.
 */
export function businessDay(ts: string | number | Date, cutoffHour: number): string {
  const d = new Date(ts);
  d.setHours(d.getHours() - cutoffHour);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when an open session belongs to a business day before "now". */
export function isStaleSession(
  session: RegisterSession,
  cutoffHour: number,
  now: Date = new Date()
): boolean {
  return businessDay(session.openedAt, cutoffHour) < businessDay(now, cutoffHour);
}

/**
 * True when the blocking open-register dialog should be shown:
 * - no session yet, or
 * - the open session belongs to an earlier business day (stale → must reconcile), or
 * - the last session was *closed* on an earlier business day (a new day has started).
 * A session closed on the current business day is dormant — closing for the day must
 * not immediately re-prompt an open.
 */
export function needsOpenRegister(
  session: RegisterSession | null | undefined,
  cutoffHour: number,
  now: Date = new Date()
): boolean {
  if (!session) return true;
  if (session.status === "open") return isStaleSession(session, cutoffHour, now);
  // closed: prompt only if it operated on an earlier business day
  return businessDay(session.openedAt, cutoffHour) < businessDay(now, cutoffHour);
}

/**
 * Cash contribution of a single order to the drawer, in display units.
 * - Cancelled orders contribute 0.
 * - Split payments: only cash-typed payments count.
 * - Refunds on cash payments subtract.
 * - Cash-rounding markets: the rounded `metadata.cash_collected` (the amount that
 *   physically hit the drawer) is preferred over the exact captured total.
 * - Fallback for orders missing per-provider granularity (e.g. pp_system_default):
 *   use the canonical method type against the order total, minus refunds.
 */
export function orderCashContribution(
  order: AdminOrder,
  store: AdminStore | null | undefined
): number {
  if (order.status === "canceled") return 0;

  const collections = order.payment_collections ?? [];
  let cashPayments = 0;
  let cashRefunds = 0;
  let cashPaymentSeen = false;

  for (const collection of collections) {
    for (const payment of collection.payments ?? []) {
      if (getMethodType(store, payment.provider_id) === "cash") {
        cashPaymentSeen = true;
        cashPayments += toNumber(payment.amount);
        const refunds = (payment as { refunds?: { amount?: unknown }[] }).refunds ?? [];
        for (const refund of refunds) cashRefunds += toNumber(refund.amount);
      }
    }
  }

  // Prefer the rounded cash actually collected (stamped at checkout) so expected
  // cash matches the physical drawer in cash-rounding markets; refunds still net out.
  const collected = cashCollectedFromMeta(order);
  if (collected != null) return collected - cashRefunds;

  if (cashPaymentSeen) return cashPayments - cashRefunds;

  if (getOrderPaymentMethodType(order, store) === "cash") {
    const refunded = toNumber((order as { refunded_total?: unknown }).refunded_total);
    return toNumber(order.total) - refunded;
  }

  return 0;
}

/** Rounded cash collected, stamped at checkout (`metadata.cash_collected`), or null. */
function cashCollectedFromMeta(order: AdminOrder): number | null {
  const raw = (order.metadata as Record<string, unknown> | null | undefined)
    ?.cash_collected;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Sum of mid-shift pay-ins and drops for a session (display units, positive). */
export function movementTotals(session: RegisterSession): {
  payins: number;
  drops: number;
} {
  let payins = 0;
  let drops = 0;
  for (const m of session.movements) {
    if (m.type === "payin") payins += m.amount;
    else if (m.type === "drop") drops += m.amount;
  }
  return { payins, drops };
}

/**
 * Expected drawer cash for a session:
 *   openingFloat + cash sales - cash refunds + pay-ins - drops
 */
export function computeExpectedCash(
  session: RegisterSession,
  orders: AdminOrder[],
  store: AdminStore | null | undefined
): number {
  const sales = orders.reduce(
    (sum, order) => sum + orderCashContribution(order, store),
    0
  );
  const { payins, drops } = movementTotals(session);

  return session.openingFloat + sales + payins - drops;
}

/** SHA-256 hex digest of a PIN. The raw PIN is never stored. */
export async function hashPin(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(raw: string, hash: string): Promise<boolean> {
  return (await hashPin(raw)) === hash;
}

export function newSessionId(): string {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newMovementId(): string {
  return `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
