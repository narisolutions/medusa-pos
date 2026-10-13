import type { StatusIntent } from "@/components/ui/status-chip";

type StatusKind = "order" | "payment" | "fulfillment";

const INTENTS: Record<StatusKind, Record<string, StatusIntent>> = {
  order: {
    pending: "info",
    completed: "success",
    draft: "neutral",
    archived: "neutral",
    canceled: "danger",
    requires_action: "warning",
  },
  payment: {
    not_paid: "warning",
    awaiting: "warning",
    authorized: "info",
    partially_authorized: "warning",
    captured: "success",
    partially_captured: "warning",
    partially_refunded: "info",
    refunded: "neutral",
    canceled: "danger",
    requires_action: "warning",
  },
  fulfillment: {
    not_fulfilled: "warning",
    partially_fulfilled: "warning",
    fulfilled: "success",
    partially_shipped: "info",
    shipped: "info",
    partially_delivered: "info",
    delivered: "success",
    canceled: "danger",
  },
};

/** How an order, payment or fulfilment status reads at a glance; unknown ones stay neutral. */
const orderStatusIntent = (kind: StatusKind, status: string): StatusIntent =>
  INTENTS[kind][status.toLowerCase()] ?? "neutral";

/** "partially_captured" → "Partially captured", for a status with no translation. */
const humanizeStatus = (status: string): string => {
  const text = status.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export { orderStatusIntent, humanizeStatus };
export type { StatusKind };
