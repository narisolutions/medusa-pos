import { useCallback, useState } from "react";
import { getSdk } from "@/config/medusa";
import { queryClient, queryKeys } from "@/config/query";
import { toNumber } from "@/utils/pos/pricing";
import {
  OrderChangeError,
  runOrderChange,
  type OrderChangeStep,
} from "@/utils/pos/order-change";

/**
 * Runs a staged post-sale operation against one order. Resolves with the
 * backend's outstanding amount once applied (positive: the customer owes);
 * otherwise throws an `OrderChangeError` having rolled back what it could.
 */
const useOrderChange = (orderId: string) => {
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const run = useCallback(
    async (steps: OrderChangeStep[]): Promise<number> => {
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

export { useOrderChange };
