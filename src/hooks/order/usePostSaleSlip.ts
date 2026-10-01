import { useCallback } from "react";
import { toast } from "sonner";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { useTranslation } from "@/i18n";
import { printerIssueStaffHintToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import type { PostSaleSlip } from "@/utils/pos/receipt/post-sale-slip";

/** Prints the slip without holding up the dialog, like the receipt after a sale. */
const usePostSaleSlip = () => {
  const { t } = useTranslation();
  const { printPostSaleSlip, getDefaultPrinter } = usePrinterService();

  return useCallback(
    (slip: PostSaleSlip) => {
      const printer = getDefaultPrinter();
      if (!printer || printer.autoPrintReceipt === false) return;
      printPostSaleSlip(slip).catch((error) => {
        void logger.warn(`Post-sale slip did not print: ${safeStringify(error)}`);
        toast.error(t("orders.receipt_did_not_print"), {
          description: printerIssueStaffHintToast(printer.name),
        });
      });
    },
    [printPostSaleSlip, getDefaultPrinter, t]
  );
};

export { usePostSaleSlip };
