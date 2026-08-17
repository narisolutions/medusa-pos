import { AdminOrder, AdminStore } from "@medusajs/types";
import {
  getPaymentMethodsForSettings,
  getMethodType,
  type PaymentMethodType,
} from "@/utils/settings/store/metadata";
import { toNumber } from "@/utils/pos/pricing";

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
 * Returns the human-readable payment method label for an order.
 * Falls back to the raw provider_id if no matching configured method is found.
 */
export function getOrderPaymentMethodLabel(
  order: AdminOrder,
  store: AdminStore | null | undefined
): string {
  const providerId = getOrderPaymentProviderId(order);
  if (!providerId) return "";

  const configuredMethods = getPaymentMethodsForSettings(store);
  return (
    configuredMethods.find(
      (m) => m.id?.toLowerCase() === providerId.toLowerCase()
    )?.label ?? providerId
  );
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
