import { useState, useMemo, useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/config/query";
import { getSdk } from "@/config/medusa";
import { useTranslation } from "@/i18n";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useOrderProcessing } from "@/hooks/order/useOrderProcessing";
import { useCashTender } from "@/hooks/order/useCashTender";
import { usePostSaleCash } from "@/hooks/order/usePostSaleCash";
import { settleOutstanding } from "@/utils/pos/order-processing";
import { toNumber } from "@/utils/pos/pricing";
import { getMethodType, getPaymentMethods } from "@/utils/settings/store/metadata";
import { getOrderChosenProviderId } from "@/utils/pos/payment";
import { formatPrice, handleErrorToast, printerIssueStaffHintToast } from "@/utils/helpers";
import { getCashRounding, roundCashAmount } from "@/utils/settings/preferences";
import { logger, safeStringify } from "@/utils/logger";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { ORDER_DETAIL_FIELDS } from "@/hooks/queries/useQueryOrder";

// "Record payment" dialog: captures an outstanding payment on an existing (pay-later)
// order and completes it once both paid and fulfilled.
export const useRecordPayment = (order: AdminOrder, onClose?: () => void) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: store } = useQueryStore();
  const { processPaymentCollection } = useOrderProcessing();
  const { record: recordCash, isCashBlocked } = usePostSaleCash();
  const { printOrderReceipt, getDefaultPrinter } = usePrinterService();

  const [isProcessing, setIsProcessing] = useState(false);

  const methods = useMemo(() => getPaymentMethods(store), [store]);

  // Default to the method the order was rung up with (intended provider), else first enabled.
  const [selectedMethod, setSelectedMethod] = useState<string>(
    () => getOrderChosenProviderId(order) ?? methods[0]?.id ?? ""
  );

  // A top-up after an added item or exchange: the first collection is the paid
  // sale, and only the difference is owed — processPaymentCollection would pick the wrong one.
  const isTopUp = (order.payment_collections ?? []).some((c) => c.status === "completed");
  const total = isTopUp
    ? toNumber(order.summary?.pending_difference)
    : order.summary?.accounting_total ?? order.total ?? 0;
  const currency = order.currency_code;

  // Cash is counted as at checkout: what was handed over, and the change. Cash
  // rounds to the configured step; the order's own total is left as it is.
  const isCashSelected = !!selectedMethod && getMethodType(store, selectedMethod) === "cash";
  const cashRoundingActive = isCashSelected && getCashRounding().enabled;
  const cashDue = cashRoundingActive ? roundCashAmount(toNumber(total)) : toNumber(total);
  const tender = useCashTender(cashDue, isCashSelected);

  const handleConfirm = useCallback(async () => {
    if (!selectedMethod) {
      handleErrorToast(t("checkout.select_payment_method"));
      return;
    }

    const isCash = isCashSelected;
    if (isCash && isCashBlocked) {
      handleErrorToast(t("checkout.register_closed"));
      return;
    }
    if (isCash && !tender.canProcessPayment) return;
    // Read now: the dialog closes when the payment is through.
    const tendered = parseFloat(tender.customerPaid) || 0;
    const changeDue = tender.change;

    setIsProcessing(true);
    try {
      const sdk = getSdk();

      // Capture the outstanding amount with the chosen provider.
      if (isTopUp) await settleOutstanding(order.id, selectedMethod);
      else await processPaymentCollection(order, selectedMethod);

      if (isCash) {
        // What was handed over, on the order, so the receipt prints it and the change.
        // Not on a top-up: the receipt's figures are the first sale's.
        if (!isTopUp) {
          try {
            await sdk.admin.order.update(order.id, {
              metadata: {
                ...(order.metadata ?? {}),
                cash_paid: tendered,
                ...(cashRoundingActive ? { cash_collected: cashDue } : {}),
              },
            });
          } catch (metadataError) {
            void logger.warn(`Cash tendered was not saved on the order: ${safeStringify(metadataError)}`);
          }
        }
        await recordCash(
          order,
          "payin",
          cashDue,
          t("orders.post_sale.movement_payment", { id: order.display_id })
        );
      }

      // Delivered + now paid → complete (skip if backend auto-completed; non-fatal).
      const isFulfilled =
        order.fulfillment_status === "fulfilled" ||
        order.fulfillment_status === "shipped" ||
        order.fulfillment_status === "delivered";
      if (isFulfilled && order.status !== "completed") {
        try {
          await sdk.admin.order.complete(order.id, {});
        } catch {
          // non-fatal
        }
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      toast.success(t("orders.record_payment_success"), {
        ...(isCash && changeDue > 0
          ? { description: `${t("checkout.change_due")}: ${formatPrice(changeDue, currency || "")}` }
          : {}),
      });
      onClose?.();

      // The customer has now paid: print the receipt, from the paid order, like checkout does.
      const printer = getDefaultPrinter();
      if (printer && printer.autoPrintReceipt !== false) {
        void (async () => {
          try {
            const { order: paid } = await sdk.admin.order.retrieve(order.id, { fields: ORDER_DETAIL_FIELDS });
            await printOrderReceipt(paid);
          } catch (printError) {
            void logger.warn(`Receipt after recorded payment did not print: ${safeStringify(printError)}`);
            toast.error(t("orders.receipt_did_not_print"), {
              description: printerIssueStaffHintToast(printer.name),
            });
          }
        })();
      }
    } catch (error) {
      handleErrorToast(
        error instanceof Error ? error.message : t("orders.record_payment_failed")
      );
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMethod, order, isTopUp, isCashBlocked, recordCash, processPaymentCollection, printOrderReceipt, getDefaultPrinter, queryClient, onClose, t, isCashSelected, cashDue, cashRoundingActive, currency, tender.canProcessPayment, tender.change, tender.customerPaid]);

  return {
    methods,
    selectedMethod,
    setSelectedMethod,
    total,
    currency,
    isProcessing,
    handleConfirm,
    isCashSelected,
    cashDue,
    tender,
  };
};
