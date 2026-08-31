import { UseQueryResult } from "@tanstack/react-query";
import { AdminDraftOrder } from "@medusajs/types";
import { useQueryDraftOrders } from "./useQueryDraftOrders";

const countParked = (draftOrders: AdminDraftOrder[]): number => draftOrders.length;

// Sidebar badge count, derived from the parked-sales list so the tab is already warm.
const useParkedSalesCount = (): UseQueryResult<number, Error> =>
  useQueryDraftOrders({ select: countParked });

export { useParkedSalesCount };
