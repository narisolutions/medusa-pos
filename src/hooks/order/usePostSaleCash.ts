import { useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { useRegister } from "@/context/register";
import { needsSessionMovement } from "@/utils/pos/register";

/**
 * Records cash taken or refunded after the sale on the open register session,
 * when that session would not otherwise count it (the order predates it).
 */
const usePostSaleCash = () => {
  const { enabled, session, isOpen, addMovement } = useRegister();

  const record = useCallback(
    async (order: AdminOrder, type: "payin" | "drop", amount: number, reason: string) => {
      if (!enabled || amount <= 0 || !needsSessionMovement(order, session)) return;
      await addMovement(type, amount, reason);
    },
    [enabled, session, addMovement]
  );

  /** Cash must not change hands while the register is on but closed — as at checkout. */
  const isCashBlocked = enabled && !isOpen;

  return { record, isCashBlocked };
};

export { usePostSaleCash };
