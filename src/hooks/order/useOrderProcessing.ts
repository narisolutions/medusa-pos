import { useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { handleErrorToast } from "@/utils/helpers";
import {
  processPaymentCollection,
  processFulfillment as fulfillOrder,
} from "@/utils/pos/order-processing";

/**
 * Shared order-processing primitives used by both the checkout payment flow
 * and the order-detail "record payment" flow. The work lives in
 * `@/utils/pos/order-processing` so non-React callers can run it too.
 *
 * - processPaymentCollection: ensures the order's payment is captured (see
 *   project memory project_payment_provider_flow).
 * - processFulfillment: fulfills + marks delivered (this is what decrements
 *   inventory at the stock location). Errors are non-fatal (surface a toast).
 */
const useOrderProcessing = () => {
  const processFulfillment = useCallback(
    async (order: AdminOrder): Promise<void> => {
      try {
        await fulfillOrder(order);
      } catch (error) {
        handleErrorToast(
          `Fulfillment failed (${error instanceof Error ? error.message : "Unknown"}), but order created`
        );
      }
    },
    []
  );

  return { processPaymentCollection, processFulfillment };
};

export { useOrderProcessing };
