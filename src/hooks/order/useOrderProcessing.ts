import { useCallback } from "react";
import { getSdk } from "@/config/medusa";
import { AdminOrder } from "@medusajs/types";
import storage from "@/utils/storage";
import { handleErrorToast } from "@/utils/helpers";

/**
 * Shared order-processing primitives used by both the checkout payment flow
 * and the order-detail "record payment" flow.
 *
 * - processPaymentCollection: ensures the order's payment is captured. Reuses an
 *   existing payment collection or creates one, opens a payment session for the
 *   chosen provider, then captures the pending payment. Falls back to markAsPaid
 *   when the provider does not auto-authorize (see project memory
 *   project_payment_provider_flow).
 * - processFulfillment: fulfills + marks delivered (this is what decrements
 *   inventory at the stock location). Errors are non-fatal (surface a toast).
 */
const useOrderProcessing = () => {
  const processPaymentCollection = useCallback(
    async (order: AdminOrder, providerId: string): Promise<void> => {
      const sdk = getSdk();

      if (
        order.payment_status === "captured" ||
        order.payment_status === "authorized"
      ) {
        return;
      }

      let collectionId: string;

      if (order.payment_collections && order.payment_collections.length > 0) {
        collectionId = order.payment_collections[0].id;
      } else {
        const paymentAmount = order.summary?.accounting_total || order.total || 0;
        const { payment_collection } = await sdk.admin.paymentCollection.create({
          order_id: order.id,
          amount: paymentAmount,
        });
        collectionId = payment_collection.id;
      }

      const { payment_collection: updatedCollection } =
        await sdk.admin.paymentCollection.createPaymentSession(
          collectionId,
          { provider_id: providerId },
          { fields: "*payment_sessions,*payments" }
        );

      const alreadyCaptured = updatedCollection.payments?.find(
        (p) => !!p.captured_at
      );
      if (alreadyCaptured) {
        return;
      }

      const pendingPayment = updatedCollection.payments?.find(
        (p) => !p.captured_at
      );

      if (pendingPayment?.id) {
        await sdk.admin.payment.capture(pendingPayment.id, {});
        return;
      }

      // Provider did not auto-authorize — fall back to markAsPaid.
      // Fix: return PaymentSessionStatus.AUTHORIZED from initiatePayment() in the provider.
      await sdk.admin.paymentCollection.markAsPaid(collectionId, {
        order_id: order.id,
      });
    },
    []
  );

  const processFulfillment = useCallback(
    async (order: AdminOrder): Promise<void> => {
      const sdk = getSdk();

      if (
        order.fulfillment_status === "fulfilled" ||
        order.fulfillment_status === "shipped" ||
        order.fulfillment_status === "delivered"
      ) {
        return;
      }

      try {
        if (order.fulfillments && order.fulfillments.length > 0) {
          const existingFulfillment = order.fulfillments[0];
          await sdk.admin.order.markAsDelivered(
            order.id,
            existingFulfillment.id
          );
          return;
        }

        const itemsToFulfill =
          order.items?.map((item) => ({
            id: item.id,
            quantity: item.quantity || 1,
          })) || [];

        if (itemsToFulfill.length === 0) {
          return;
        }

        const locationId = await storage.getItem("stock_location_id");

        const response = await sdk.admin.order.createFulfillment(order.id, {
          items: itemsToFulfill,
          no_notification: true,
          ...(locationId ? { location_id: locationId } : {}),
        });

        let fulfillmentId = response.order?.fulfillments?.[0]?.id;

        if (!fulfillmentId) {
          const { order: refreshedOrder } = await sdk.admin.order.retrieve(
            order.id,
            { fields: "*fulfillments" }
          );
          fulfillmentId = refreshedOrder.fulfillments?.[0]?.id;
        }

        if (!fulfillmentId) {
          throw new Error("Failed to get fulfillment ID");
        }

        await sdk.admin.order.markAsDelivered(order.id, fulfillmentId);
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
