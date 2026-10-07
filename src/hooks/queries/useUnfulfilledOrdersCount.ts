import { useEffect, useState } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { AdminOrder } from "@medusajs/types";
import { useQueryRecentOrders } from "./useQueryRecentOrders";

const countUnfulfilled = (orders: AdminOrder[]): number =>
  orders.filter((order) => order.fulfillment_status === "not_fulfilled").length;

// The scan is heavy (see useQueryRecentOrders); started at once it competes with the
// screen being opened. A badge can wait a few seconds.
const FIRST_SCAN_DELAY_MS = 5_000;

// Sidebar badge count, derived from the recent-orders scan.
const useUnfulfilledOrdersCount = (): UseQueryResult<number, Error> => {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), FIRST_SCAN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return useQueryRecentOrders({ select: countUnfulfilled, enabled: started });
};

export { useUnfulfilledOrdersCount };
