import { useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { useRegister } from "@/context/register";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { useTranslation } from "@/i18n";
import { cashDrawerIssueStaffHintToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import { needsSessionMovement } from "@/utils/pos/register";

/**
 * Records cash taken or refunded after the sale on the open register session,
 * when that session would not otherwise count it (the order predates it).
 */
const usePostSaleCash = () => {
  const { t } = useTranslation();
  const { enabled, session, isOpen, addMovement } = useRegister();
  const { openCashDrawer, getDefaultPrinter } = usePrinterService();

  const record = useCallback(
    async (order: AdminOrder, type: "payin" | "drop", amount: number, reason: string) => {
      if (!enabled || amount <= 0 || !needsSessionMovement(order, session)) return;
      await addMovement(type, amount, reason);
    },
    [enabled, session, addMovement]
  );

  /** Cash in or out of the drawer — mirrors the post-order hardware step. */
  const openDrawer = useCallback(() => {
    const printer = getDefaultPrinter();
    if (!printer?.openCashDrawer || !printer.openCashDrawerOnCash) return;

    openCashDrawer(printer).catch((drawerError) => {
      void logger.warn(`Post-sale cash drawer failed: ${safeStringify(drawerError)}`);
      toast.error(t("checkout.cash_drawer_error_title"), {
        description: cashDrawerIssueStaffHintToast(printer.name),
      });
    });
  }, [getDefaultPrinter, openCashDrawer, t]);

  /** Cash must not change hands while the register is on but closed — as at checkout. */
  const isCashBlocked = enabled && !isOpen;

  return { record, openDrawer, isCashBlocked };
};

export { usePostSaleCash };
