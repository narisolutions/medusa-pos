import { AdminOrder } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { logger, safeStringify } from "@/utils/logger";
import storage from "@/utils/storage";

/**
 * Ensures the order's payment is captured. Reuses an existing payment
 * collection or creates one, opens a payment session for the chosen provider,
 * then captures the pending payment. Falls back to markAsPaid when the
 * provider does not auto-authorize.
 */
async function processPaymentCollection(
  order: AdminOrder,
  providerId: string
): Promise<void> {
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

  // Provider didn't auto-authorize — mark as paid. Try the real provider
  // first; if it can't authorize (HTTP 422), retry under the system default.
  // markAsPaid returns an empty body and only throws on a genuine rejection,
  // so the retry can't double-pay. The real provider is still recoverable from
  // the payment session via getOrderPaymentProviderId.
  try {
    await sdk.admin.paymentCollection.markAsPaid(collectionId, {
      order_id: order.id,
      provider_id: providerId,
    });
  } catch (markPaidError) {
    void logger.error(
      `markAsPaid with provider_id failed; retrying with system default: ${safeStringify(markPaidError)}`
    );
    await sdk.admin.paymentCollection.markAsPaid(collectionId, {
      order_id: order.id,
    });
  }
}

/**
 * Fulfills + marks delivered, which is what decrements inventory at the stock
 * location. Throws on failure; callers decide whether that is fatal.
 */
async function processFulfillment(order: AdminOrder): Promise<void> {
  const sdk = getSdk();

  if (
    order.fulfillment_status === "fulfilled" ||
    order.fulfillment_status === "shipped" ||
    order.fulfillment_status === "delivered"
  ) {
    return;
  }

  if (order.fulfillments && order.fulfillments.length > 0) {
    const existingFulfillment = order.fulfillments[0];
    await sdk.admin.order.markAsDelivered(order.id, existingFulfillment.id);
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
    const { order: refreshedOrder } = await sdk.admin.order.retrieve(order.id, {
      fields: "*fulfillments",
    });
    fulfillmentId = refreshedOrder.fulfillments?.[0]?.id;
  }

  if (!fulfillmentId) {
    throw new Error("Failed to get fulfillment ID");
  }

  await sdk.admin.order.markAsDelivered(order.id, fulfillmentId);
}

export { processPaymentCollection, processFulfillment };
