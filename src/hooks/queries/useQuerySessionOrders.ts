import { useCallback } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { AdminOrder } from "@medusajs/types";
import type { RegisterSession } from "@/types/register";
import { useQueryRecentOrders } from "./useQueryRecentOrders";

// Register-session orders for expected-cash: a `select` projection over the shared
// recent-orders scan, lower-bounded by openedAt. Attribution happens in useExpectedCash.
const useQuerySessionOrders = (
  session: RegisterSession | null
): UseQueryResult<AdminOrder[], Error> => {
  const openedAt = session?.openedAt;

  const selectSessionWindow = useCallback(
    (orders: AdminOrder[]) => {
      const since = openedAt ? new Date(openedAt).getTime() : 0;
      return orders.filter(
        (o) => new Date(o.created_at as string).getTime() >= since
      );
    },
    [openedAt]
  );

  return useQueryRecentOrders({
    enabled: !!session && session.status === "open",
    select: selectSessionWindow,
  });
};

export { useQuerySessionOrders };
