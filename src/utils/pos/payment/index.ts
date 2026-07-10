import { AdminOrder, AdminStore } from "@medusajs/types";
import {
  getPaymentMethodsForSettings,
  getMethodType,
} from "@/utils/settings/store/metadata";

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
 * Returns the behavioral type ("cash" or "card") for the payment method used in an order.
 */
export function getOrderPaymentMethodType(
  order: AdminOrder,
  store: AdminStore | null | undefined
): "cash" | "card" {
  return getMethodType(store, getOrderPaymentProviderId(order));
}
