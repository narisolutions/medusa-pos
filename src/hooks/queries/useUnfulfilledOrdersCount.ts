import { UseQueryResult } from "@tanstack/react-query";
import { AdminOrder } from "@medusajs/types";
import { useQueryRecentOrders } from "./useQueryRecentOrders";

const countUnfulfilled = (orders: AdminOrder[]): number =>
  orders.filter((order) => order.fulfillment_status === "not_fulfilled").length;

// Sidebar badge count, derived from the shared recent-orders scan.
const useUnfulfilledOrdersCount = (): UseQueryResult<number, Error> =>
  useQueryRecentOrders({ select: countUnfulfilled });

export { useUnfulfilledOrdersCount };
