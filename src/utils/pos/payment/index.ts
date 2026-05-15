import { AdminOrder, AdminStore } from "@medusajs/types";
import {
  getPaymentMethodsForSettings,
  getMethodType,
} from "@/utils/settings/store/metadata";

/**
 * Returns the canonical payment provider_id for a completed order.
 * Priority: payments[0].provider_id → payment_sessions[0].provider_id → metadata fallback.
 * The metadata fallback handles orders where the backend /process endpoint returned
 * pp_system_default instead of the chosen custom provider.
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

  // Legacy metadata fallback
  const metadataProvider = order.metadata?.payment_method as string | undefined;
  if (metadataProvider) {
    return String(metadataProvider).toLowerCase();
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
