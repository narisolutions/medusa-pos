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
      printPostSaleSlip(slip).catch((error) => {
        void logger.warn(`Post-sale slip did not print: ${safeStringify(error)}`);
        const printer = getDefaultPrinter();
        toast.error(t("orders.receipt_did_not_print"), {
          description: printer ? printerIssueStaffHintToast(printer.name) : t("checkout.no_default_printer"),
        });
      });
    },
    [printPostSaleSlip, getDefaultPrinter, t]
  );
};

export { usePostSaleSlip };
