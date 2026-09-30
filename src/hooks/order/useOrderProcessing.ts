import { useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { getApiErrorMessage, handleErrorToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
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
 *   inventory at the stock location). Errors are non-fatal (surface a toast);
 *   resolves false when the goods were not handed over.
 */
const useOrderProcessing = () => {
  const processFulfillment = useCallback(
    async (order: AdminOrder): Promise<boolean> => {
      try {
        await fulfillOrder(order);
        return true;
      } catch (error) {
        void logger.error(`Fulfillment failed: ${safeStringify(error)}`);
        handleErrorToast(
          `Fulfillment failed (${getApiErrorMessage(error, "Unknown")}), but order created`
        );
        return false;
      }
    },
    []
  );

  return { processPaymentCollection, processFulfillment };
};

export { useOrderProcessing };
