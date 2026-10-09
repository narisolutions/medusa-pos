import { t as translate } from "@/i18n";
import { AdminOrder, AdminStore } from "@medusajs/types";
import {
  getPaymentMethodsForSettings,
  getMethodType,
  type PaymentMethodType,
} from "@/utils/settings/store/metadata";
import { toNumber } from "@/utils/pos/pricing";

const SYSTEM_DEFAULT_PROVIDER = "pp_system_default";

/** Medusa registers a till tender as `pp_<identifier>_pos`; the rest belong to a web shop or a delivery platform. */
const isTillProvider = (id: string): boolean => id.endsWith("_pos") || id === SYSTEM_DEFAULT_PROVIDER;

/** The backend's payment providers split for the chooser: the till's own first, each group sorted. */
export function groupProvidersForTill(ids: string[]): { till: string[]; other: string[] } {
  const sorted = [...new Set(ids)].sort((a, b) => a.localeCompare(b));
  return { till: sorted.filter(isTillProvider), other: sorted.filter((id) => !isTillProvider(id)) };
}

/**
 * Returns an order's payment provider_id: payments[0] → payment_sessions[0].
 * The session keeps the real provider chosen at checkout, so it's used when the
 * captured payment fell back to pp_system_default via markAsPaid.
 */
export function getOrderPaymentProviderId(
  order: AdminOrder
): string | undefined {
  const collection = order.payment_collections?.[0];

  // Prefer an actual provider over pp_system_default (created by markAsPaid fallback).
  // Check payment first, then session (which always has the real provider_id from createPaymentSession).
  const paymentProviderId = collection?.payments?.[0]?.provider_id;
  if (paymentProviderId && paymentProviderId !== "pp_system_default") {
    return paymentProviderId;
  }

  const sessionProviderId = collection?.payment_sessions?.[0]?.provider_id;
  if (sessionProviderId && sessionProviderId !== "pp_system_default") {
    return sessionProviderId;
  }

  return paymentProviderId; // pp_system_default or undefined
}

/**
 * The method the order was rung up with: the provider that paid it, or for an
 * unpaid pay-later order the one chosen at checkout. For display and defaults
 * only — behaviour reads real payments, so an unpaid "cash" order never counts as cash.
 */
export function getOrderChosenProviderId(order: AdminOrder): string | undefined {
  const paid = getOrderPaymentProviderId(order);
  if (paid && paid !== SYSTEM_DEFAULT_PROVIDER) return paid;
  const chosen = (order.metadata as { pay_later_method?: unknown } | null | undefined)?.pay_later_method;
  return typeof chosen === "string" && chosen ? chosen : paid;
}

/**
 * Returns the human-readable payment method label for an order.
 * Falls back to the raw provider_id if no matching configured method is found.
 */
export function getOrderPaymentMethodLabel(
  order: AdminOrder,
  store: AdminStore | null | undefined
): string {
  return getPaymentMethodLabel(store, getOrderChosenProviderId(order));
}

/** The configured label for a provider id, e.g. "Cash"; the id itself when unconfigured. */
export function getPaymentMethodLabel(
  store: AdminStore | null | undefined,
  providerId: string | null | undefined
): string {
  if (!providerId) return "";

  const configuredMethods = getPaymentMethodsForSettings(store);
  const configured = configuredMethods.find(
    (m) => m.id?.toLowerCase() === providerId.toLowerCase()
  )?.label;
  if (configured) return configured;

  // Medusa's own fallback for payments marked paid outside a provider; "pp_system_default" means nothing to staff.
  if (providerId.toLowerCase() === SYSTEM_DEFAULT_PROVIDER) return translate("orders.payment_other");
  return providerId;
}

/**
 * Returns the behavioral type for the payment method used in an order.
 */
export function getOrderPaymentMethodType(
  order: AdminOrder,
  store: AdminStore | null | undefined
): PaymentMethodType {
  return getMethodType(store, getOrderPaymentProviderId(order));
}

export type RefundablePayment = {
  id: string;
  providerId?: string;
  captured: number;
  refunded: number;
  refundable: number;
};

/**
 * Payments on an order that still have money left to give back.
 * Medusa caps a refund at (sum of captures - sum of refunds), so an uncaptured
 * payment is never refundable no matter what the order total says.
 */
export function getRefundablePayments(order: AdminOrder): RefundablePayment[] {
  const refundable: RefundablePayment[] = [];

  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      if (!payment.id) continue;

      const captures = payment.captures ?? [];
      const captured = captures.length
        ? captures.reduce((sum, capture) => sum + toNumber(capture.amount), 0)
        : payment.captured_at
          ? toNumber(payment.amount)
          : 0;

      const refunded = (payment.refunds ?? []).reduce(
        (sum, refund) => sum + toNumber(refund.amount),
        0
      );

      // Round to cents: summing float amounts drifts, and the numpad would
      // otherwise prefill something like 29.990000000000002.
      const remaining = Math.max(0, Math.round((captured - refunded) * 100) / 100);
      if (remaining <= 0) continue;

      refundable.push({
        id: payment.id,
        providerId: payment.provider_id,
        captured,
        refunded,
        refundable: remaining,
      });
    }
  }

  return refundable;
}

/** Total still refundable across all of an order's payments. */
export function getOrderRefundableTotal(order: AdminOrder): number {
  return getRefundablePayments(order).reduce(
    (sum, payment) => sum + payment.refundable,
    0
  );
}

/** Amount already refunded. Medusa keeps this on the summary, not the order root. */
export function getOrderRefundedTotal(order: AdminOrder): number {
  return toNumber(order.summary?.refunded_total);
}

/**
 * What the sale was worth. Refunding adds a credit line that drives `order.total`
 * to 0, so the raw total misreports a refunded order as a zero-value sale.
 */
export function getOrderSaleTotal(order: AdminOrder): number {
  const original = toNumber(order.summary?.original_order_total);
  return original > 0 ? original : toNumber(order.total);
}

/**
 * Splits a refund across payments, largest first so it takes as few refund
 * calls as possible — one refund can never exceed one payment's captured
 * amount. Null when the payments cannot cover it.
 */
export function allocateRefund(
  payments: RefundablePayment[],
  amount: number
): { id: string; amount: number }[] | null {
  let remaining = Math.round(amount * 100);
  const allocation: { id: string; amount: number }[] = [];

  for (const payment of [...payments].sort((a, b) => b.refundable - a.refundable)) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Math.round(payment.refundable * 100));
    if (take <= 0) continue;
    allocation.push({ id: payment.id, amount: take / 100 });
    remaining -= take;
  }

  return remaining > 0 ? null : allocation;
}

const cents = (amount: number) => Math.round(amount * 100);

/** Payments that can each give back the whole amount alone — no split needed. */
export function paymentsCovering(
  payments: RefundablePayment[],
  amount: number
): RefundablePayment[] {
  return payments.filter((p) => cents(p.refundable) >= cents(amount));
}

/**
 * Which covering payment to suggest: the one for exactly this amount (most
 * likely what paid for the goods coming back), else the most recent.
 */
export function defaultRefundPayment(
  covering: RefundablePayment[],
  amount: number
): RefundablePayment | undefined {
  return (
    covering.find((p) => cents(p.refundable) === cents(amount)) ?? covering[covering.length - 1]
  );
}
