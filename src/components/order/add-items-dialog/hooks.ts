import { useCallback, useMemo, useState } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { getSdk } from "@/config/medusa";
import { useTranslation } from "@/i18n";
import { formatPrice, getOrderCurrency, handleErrorToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQueryProducts } from "@/hooks/queries/useQueryProducts";
import { useSalesChannel } from "@/context/sales-channel";
import { describeChangeError, useOrderChange } from "@/hooks/order/useOrderChange";
import { useSettleOutstanding } from "@/hooks/order/useSettleOutstanding";
import { usePostSaleCash } from "@/hooks/order/usePostSaleCash";
import { useOutboundLines } from "../outbound-lines/hooks";
import { fulfilRemainingItems } from "@/utils/pos/order-processing";
import { getOrderPaymentProviderId } from "@/utils/pos/payment";
import { getMethodType, getPaymentMethods } from "@/utils/settings/store/metadata";

const useAddItems = (order: AdminOrder, isOpen: boolean, onClose: () => void) => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const { data: products = [] } = useQueryProducts(salesChannelId);
  const { run, currentStep } = useOrderChange(order.id);
  const settle = useSettleOutstanding();
  const { record: recordCash, openDrawer, isCashBlocked } = usePostSaleCash();

  const methods = useMemo(() => getPaymentMethods(store), [store]);
  const defaultMethod = () => getOrderPaymentProviderId(order) ?? methods[0]?.id ?? "";
  const [selectedMethod, setSelectedMethod] = useState<string>(defaultMethod);
  const { lines, handleSelect, changeQuantity, reset, goingOut } = useOutboundLines();
  const [phase, setPhase] = useState<"fulfil" | "settle" | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Fresh dialog on every open (React's alternative to a reset effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      reset();
      setSelectedMethod(defaultMethod());
      setPhase(null);
    }
  }

  const currency = getOrderCurrency(order);

  const handleConfirm = useCallback(async () => {
    if (isBusy || lines.length === 0 || !selectedMethod) return;

    const isCash = getMethodType(store, selectedMethod) === "cash";
    if (isCash && isCashBlocked) {
      handleErrorToast(t("checkout.register_closed"));
      return;
    }

    setIsBusy(true);
    const sdk = getSdk();
    try {
      try {
        await run([
          {
            key: "initiate",
            run: async () => {
              await sdk.admin.orderEdit.initiateRequest({ order_id: order.id });
            },
            // An edit cancels with cancelRequest right up to confirm (verified on staging).
            undo: async () => {
              await sdk.admin.orderEdit.cancelRequest(order.id);
            },
          },
          {
            key: "add_items",
            run: async () => {
              await sdk.admin.orderEdit.addItems(order.id, {
                items: lines.map((l) => ({ variant_id: l.variant.id, quantity: l.quantity })),
              });
            },
          },
          {
            key: "request",
            run: async () => {
              await sdk.admin.orderEdit.request(order.id);
            },
          },
          {
            key: "confirm",
            run: async () => {
              await sdk.admin.orderEdit.confirm(order.id);
            },
          },
        ]);
      } catch (error) {
        void logger.error(`Add items change failed: ${safeStringify(error)}`);
        handleErrorToast(describeChangeError(error, order, t));
        return;
      }

      // The goods are already in the customer's hands; a failure here must not stop payment.
      setPhase("fulfil");
      try {
        await fulfilRemainingItems(order.id);
      } catch (error) {
        void logger.error(`Add items fulfilment failed: ${safeStringify(error)}`);
        toast.warning(t("orders.post_sale.warn_fulfil_failed"));
      }

      setPhase("settle");
      try {
        const charged = await settle(order.id, selectedMethod);
        if (isCash) {
          await recordCash(
            order,
            "payin",
            charged,
            t("orders.post_sale.movement_payment", { id: order.display_id })
          );
          openDrawer();
        }
        toast.success(
          t("orders.post_sale.add_success", { amount: formatPrice(charged, currency) })
        );
      } catch (error) {
        void logger.error(`Add items settlement failed: ${safeStringify(error)}`);
        handleErrorToast(t("orders.post_sale.warn_settle_failed"));
      }

      onClose();
    } finally {
      setPhase(null);
      setIsBusy(false);
    }
  }, [
    isBusy,
    lines,
    selectedMethod,
    store,
    isCashBlocked,
    run,
    order,
    settle,
    recordCash,
    openDrawer,
    currency,
    onClose,
    t,
  ]);

  const progressKey = phase ?? currentStep;

  return {
    products,
    currency,
    lines,
    goingOut,
    methods,
    selectedMethod,
    setSelectedMethod,
    handleSelect,
    changeQuantity,
    handleConfirm,
    isBusy,
    progressLabel: progressKey ? t(`orders.post_sale.step_${progressKey}`) : null,
  };
};

export { useAddItems };
