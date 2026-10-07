import { useCallback } from "react";
import { queryClient, queryKeys } from "@/config/query";
import { settleOutstanding } from "@/utils/pos/order-processing";

/**
 * Takes payment for what a confirmed post-sale change left owing. Not
 * `processPaymentCollection`: that exits on a paid order and charges the whole
 * total. See docs/post-sale/04-money.md.
 */
const useSettleOutstanding = () =>
  useCallback(async (orderId: string, providerId: string): Promise<number> => {
    try {
      return await settleOutstanding(orderId, providerId);
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
      ]);
    }
  }, []);

export { useSettleOutstanding };
