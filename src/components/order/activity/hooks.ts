import { useMemo } from "react";
import { AdminOrder, AdminPaymentCollection, AdminPayment, AdminOrderFulfillment } from "@medusajs/types";
import { ActivityEvent } from "@/types/utils";
import constants from "@/utils/constants";
import { classifyFulfillment } from "@/utils/fulfillment";

const normalizeTimestamp = (timestamp: string | Date | undefined): string | null => {
  if (!timestamp) return null;
  return typeof timestamp === "string" ? timestamp : timestamp.toISOString();
};

const createEvent = (
  id: string,
  type: ActivityEvent["type"],
  title: string,
  timestamp: string | Date | undefined,
  options?: { amount?: number; currency?: string; itemCount?: number }
): ActivityEvent | null => {
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  if (!normalizedTimestamp) return null;

  return {
    id,
    type,
    title,
    timestamp: normalizedTimestamp,
    ...options,
  };
};

export const useActivityEvents = (order: AdminOrder) => {
  const events = useMemo(() => {
    const activityEvents: ActivityEvent[] = [];

    // Order placed
    const orderPlaced = createEvent(
      `order_placed_${order.id}`,
      "order_placed",
      "Order placed",
      order.created_at,
      {
        amount: order.total,
        currency: order.currency_code || constants.CHECKOUT_CONFIG.CURRENCY,
      }
    );
    if (orderPlaced) activityEvents.push(orderPlaced);

    // Payment events
    order.payment_collections?.forEach((collection: AdminPaymentCollection) => {
      collection.payments?.forEach((payment: AdminPayment) => {
        if (payment.captured_at) {
          const event = createEvent(
            `payment_captured_${payment.id || `payment_${collection.id}_${Date.now()}`}`,
            "payment_captured",
            "Payment captured",
            payment.captured_at,
            {
              amount: payment.amount || collection.amount || order.total,
              currency:
                order.currency_code || constants.CHECKOUT_CONFIG.CURRENCY,
            }
          );
          if (event) activityEvents.push(event);
        } else if (payment.created_at && !payment.captured_at && order.payment_status !== "captured") {
          const event = createEvent(
            `awaiting_payment_${payment.id || `awaiting_${collection.id}_${Date.now()}`}`,
            "awaiting_payment",
            "Awaiting payment",
            payment.created_at,
            {
              amount: payment.amount || collection.amount || order.total,
              currency:
                order.currency_code || constants.CHECKOUT_CONFIG.CURRENCY,
            }
          );
          if (event) activityEvents.push(event);
        }
      });

      if (order.payment_status === "captured" && collection.updated_at) {
        const hasPaymentCaptured = activityEvents.some(
          (e) => e.type === "payment_captured" && e.id.includes(String(collection.id))
        );
        if (!hasPaymentCaptured) {
          const event = createEvent(
            `payment_captured_collection_${collection.id || Date.now()}`,
            "payment_captured",
            "Payment captured",
            collection.updated_at,
            {
              amount: collection.amount || order.total,
              currency:
                order.currency_code || constants.CHECKOUT_CONFIG.CURRENCY,
            }
          );
          if (event) activityEvents.push(event);
        }
      }
    });

    // Fulfillment events
    order.fulfillments?.forEach((fulfillment: AdminOrderFulfillment) => {
      const record = fulfillment as unknown as Record<string, unknown>;
      const { isPickup, isShipping } = classifyFulfillment(fulfillment);
      const itemCount = (record.items as Array<unknown> | undefined)?.length || order.items?.length || 0;

      // Items fulfilled (generic -- always shown)
      const fulfilledEvent = createEvent(
        `fulfilled_${fulfillment.id || Date.now()}`,
        "fulfilled",
        "Items fulfilled",
        fulfillment.created_at,
        { itemCount }
      );
      if (fulfilledEvent) activityEvents.push(fulfilledEvent);

      // Items packed (generic -- shown if packed_at differs from created_at)
      const packedAt = record.packed_at as string | Date | undefined;
      if (packedAt && packedAt !== fulfillment.created_at) {
        const packedEvent = createEvent(
          `packed_${fulfillment.id || Date.now()}`,
          "fulfilled",
          "Items packed",
          packedAt,
          { itemCount }
        );
        if (packedEvent) activityEvents.push(packedEvent);
      }

      // Shipped (for shipping providers -- shown when shipped_at exists)
      const shippedAt = record.shipped_at as string | Date | undefined;
      if (shippedAt && isShipping) {
        const shipmentEvent = createEvent(
          `shipped_${fulfillment.id || Date.now()}`,
          "shipped",
          "Shipment created",
          shippedAt,
          { itemCount }
        );
        if (shipmentEvent) activityEvents.push(shipmentEvent);
      }

      // Picked up (for pickup orders -- shown when order is delivered)
      if (isPickup && order.fulfillment_status === "delivered") {
        const timestamp = shippedAt || fulfillment.updated_at || order.updated_at;
        const pickedUpEvent = createEvent(
          `marked_picked_up_${fulfillment.id || Date.now()}`,
          "marked_picked_up",
          "Marked as picked up",
          timestamp,
          { itemCount }
        );
        if (pickedUpEvent) activityEvents.push(pickedUpEvent);
      }

      // Delivered (for shipping orders -- shown when order is delivered)
      if (isShipping && order.fulfillment_status === "delivered") {
        const shippedTime = shippedAt ? new Date(shippedAt).getTime() : null;
        const updatedTime = fulfillment.updated_at ? new Date(fulfillment.updated_at).getTime() : null;
        const orderUpdatedTime = order.updated_at ? new Date(order.updated_at).getTime() : null;

        const deliveredTimestamp =
          (updatedTime && shippedTime && Math.abs(updatedTime - shippedTime) > 1000
            ? fulfillment.updated_at
            : orderUpdatedTime && shippedTime && Math.abs(orderUpdatedTime - shippedTime) > 1000
            ? order.updated_at
            : fulfillment.updated_at || order.updated_at) as string | Date | undefined;

        if (deliveredTimestamp) {
          const deliveredTimestampStr = normalizeTimestamp(deliveredTimestamp);
          if (deliveredTimestampStr) {
            const timeDiff = shippedTime && deliveredTimestampStr
              ? Math.abs(new Date(deliveredTimestampStr).getTime() - shippedTime)
              : Infinity;

            if (timeDiff > 1000 || !shippedTime) {
              const deliveredEvent = createEvent(
                `delivered_${fulfillment.id || Date.now()}`,
                "delivered",
                "Marked as delivered",
                deliveredTimestamp,
                { itemCount }
              );
              if (deliveredEvent) activityEvents.push(deliveredEvent);
            }
          }
        }
      }
    });

    // Remove duplicates and sort
    const uniqueEvents = activityEvents.filter((event, index, self) => {
      return index === self.findIndex((e) => {
        const timeDiff = Math.abs(
          new Date(e.timestamp).getTime() - new Date(event.timestamp).getTime()
        );
        return e.type === event.type && timeDiff < 1000;
      });
    });

    return uniqueEvents.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [order]);

  return events;
};
