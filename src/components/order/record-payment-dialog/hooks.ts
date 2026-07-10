import { useState, useMemo, useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/config/query";
import { getSdk } from "@/config/medusa";
import { useTranslation } from "@/i18n";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useOrderProcessing } from "@/hooks/order/useOrderProcessing";
import { getPaymentMethods } from "@/utils/settings/store/metadata";
import { getOrderPaymentProviderId } from "@/utils/pos/payment";
import { handleErrorToast } from "@/utils/helpers";

// "Record payment" dialog: captures an outstanding payment on an existing (pay-later)
// order and completes it once both paid and fulfilled.
export const useRecordPayment = (order: AdminOrder, onClose?: () => void) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: store } = useQueryStore();
  const { processPaymentCollection } = useOrderProcessing();

  const [isProcessing, setIsProcessing] = useState(false);

  const methods = useMemo(() => getPaymentMethods(store), [store]);

  // Default to the method the order was rung up with (intended provider), else first enabled.
  const [selectedMethod, setSelectedMethod] = useState<string>(
    () => getOrderPaymentProviderId(order) ?? methods[0]?.id ?? ""
  );

  const total = order.summary?.accounting_total ?? order.total ?? 0;
  const currency = order.currency_code;

  const handleConfirm = useCallback(async () => {
    if (!selectedMethod) {
      handleErrorToast(t("checkout.select_payment_method"));
      return;
    }

    setIsProcessing(true);
    try {
      const sdk = getSdk();

      // Capture the outstanding amount with the chosen provider.
      await processPaymentCollection(order, selectedMethod);

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

      toast.success(t("orders.record_payment_success"));
      onClose?.();
    } catch (error) {
      handleErrorToast(
        error instanceof Error ? error.message : t("orders.record_payment_failed")
      );
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMethod, order, processPaymentCollection, queryClient, onClose, t]);

  return {
    methods,
    selectedMethod,
    setSelectedMethod,
    total,
    currency,
    isProcessing,
    handleConfirm,
  };
};
