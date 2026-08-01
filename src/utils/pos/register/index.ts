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

/*
 * Manager PIN hashing.
 *
 * A 4-6 digit PIN has a keyspace a plain digest walks through instantly, so the
 * stored form is PBKDF2-SHA256 with a per-PIN salt: `pbkdf2$<iters>$<salt>$<hash>`.
 * Bare 64-char hex is the legacy unsalted SHA-256 — still verified so existing
 * installs keep working, and upgraded in place on first successful use (see
 * verifyManagerPin in utils/preferences/pin).
 */
const PIN_ITERATIONS = 210_000; // OWASP 2023 guidance for PBKDF2-SHA256
const PIN_SALT_BYTES = 16;
const PIN_KEY_BITS = 256;
const LEGACY_PIN_HASH = /^[0-9a-f]{64}$/i;

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/** Length-independent compare so a wrong PIN can't be narrowed by timing. */
const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

const derivePin = async (
  raw: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(raw),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    PIN_KEY_BITS
  );
  return new Uint8Array(bits);
};

const legacySha256Hex = async (raw: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** True when `stored` is the pre-PBKDF2 unsalted digest and should be re-hashed. */
export function isLegacyPinHash(stored: string): boolean {
  return LEGACY_PIN_HASH.test(stored);
}

/** Salted PBKDF2 digest of a PIN. The raw PIN is never stored. */
export async function hashPin(raw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PIN_SALT_BYTES));
  const hash = await derivePin(raw, salt, PIN_ITERATIONS);
  return `pbkdf2$${PIN_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPin(raw: string, stored: string): Promise<boolean> {
  if (isLegacyPinHash(stored)) {
    return timingSafeEqual(
      new TextEncoder().encode(await legacySha256Hex(raw)),
      new TextEncoder().encode(stored.toLowerCase())
    );
  }

  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;

  const derived = await derivePin(raw, fromBase64(salt), Number(iterations));
  return timingSafeEqual(derived, fromBase64(hash));
}

export function newSessionId(): string {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newMovementId(): string {
  return `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
