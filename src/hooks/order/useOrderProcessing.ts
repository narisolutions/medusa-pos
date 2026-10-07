import { useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { getApiErrorMessage, handleErrorToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation();

  const processFulfillment = useCallback(
    async (order: AdminOrder): Promise<boolean> => {
      try {
        await fulfillOrder(order);
        return true;
      } catch (error) {
        void logger.error(`Fulfillment failed: ${safeStringify(error)}`);
        handleErrorToast(
          t("checkout.fulfillment_failed_order_created", {
            reason: getApiErrorMessage(error, t("common.error")),
          })
        );
        return false;
      }
    },
    [t]
  );

  return { processPaymentCollection, processFulfillment };
};

export { useOrderProcessing };
