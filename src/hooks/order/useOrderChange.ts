import { useCallback, useState } from "react";
import { getSdk } from "@/config/medusa";
import { queryClient, queryKeys } from "@/config/query";
import { toNumber } from "@/utils/pos/pricing";
import {
  findOpenChange,
  OrderChangeBlockedError,
  OrderChangeError,
  runOrderChange,
  type OrderChangeStep,
} from "@/utils/pos/order-change";

const getOpenOrderChange = async (orderId: string) => {
  const { order_changes } = await getSdk().admin.order.listChanges(orderId);
  return findOpenChange(order_changes) ?? null;
};

/**
 * Runs a staged post-sale operation against one order. Resolves with the
 * backend's outstanding amount once applied (positive: the customer owes);
 * otherwise throws an `OrderChangeError` having rolled back what it could.
 * Refuses to start (`OrderChangeBlockedError`) if a change is already open.
 */
const useOrderChange = (orderId: string) => {
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const run = useCallback(
    async (steps: OrderChangeStep[]): Promise<number> => {
      const open = await getOpenOrderChange(orderId);
      if (open) throw new OrderChangeBlockedError(orderId, open.change_type ?? null);

      try {
        const outcome = await runOrderChange(steps, setCurrentStep);
        if (outcome.status !== "applied") throw new OrderChangeError(orderId, outcome);

        const { order } = await getSdk().admin.order.retrieve(orderId, {
          fields: "id,*summary",
        });
        return toNumber(order.summary?.pending_difference ?? 0);
      } finally {
        setCurrentStep(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
        ]);
      }
    },
    [orderId]
  );

  return { run, currentStep, isRunning: currentStep !== null };
};

export { useOrderChange, getOpenOrderChange };
