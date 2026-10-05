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
import { useOrderChange } from "@/hooks/order/useOrderChange";
import { describeChangeError } from "@/utils/pos/order-change";
import { useSettleOutstanding } from "@/hooks/order/useSettleOutstanding";
import { usePostSaleCash } from "@/hooks/order/usePostSaleCash";
import { usePostSaleSlip } from "@/hooks/order/usePostSaleSlip";
import { useOutboundLines } from "../outbound-lines/hooks";
import { fulfilNewItems } from "@/utils/pos/order-processing";
import { isUnpaidStatus, POST_SALE_EDIT_DESCRIPTION } from "@/utils/pos/post-sale";
import { getOrderPaymentProviderId, getPaymentMethodLabel } from "@/utils/pos/payment";
import { getMethodType, getPaymentMethods } from "@/utils/settings/store/metadata";

const useAddItems = (order: AdminOrder, isOpen: boolean, onClose: () => void) => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const { data: products = [] } = useQueryProducts(salesChannelId);
  const { run, currentStep } = useOrderChange(order.id);
  const settle = useSettleOutstanding();
  const { record: recordCash, openDrawer, isCashBlocked } = usePostSaleCash();
  const printSlip = usePostSaleSlip();

  const methods = useMemo(() => getPaymentMethods(store), [store]);
  const defaultMethod = () => getOrderPaymentProviderId(order) ?? methods[0]?.id ?? "";
  const [selectedMethod, setSelectedMethod] = useState<string>(defaultMethod);
  const { lines, handleSelect, changeQuantity, reset, goingOut, slipLines } = useOutboundLines();
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
  // A pay-later order is owed in full: added items join what is owed, nothing is taken now.
  const isUnpaidOrder = isUnpaidStatus(order.payment_status);
  const canConfirm = lines.length > 0 && (isUnpaidOrder || !!selectedMethod);

  const handleConfirm = useCallback(async () => {
    if (isBusy || !canConfirm) return;

    const isCash = !isUnpaidOrder && getMethodType(store, selectedMethod) === "cash";
    if (isCash && isCashBlocked) {
      handleErrorToast(t("checkout.register_closed"));
      return;
    }

    setIsBusy(true);
    const sdk = getSdk();
    const linesBefore = new Set((order.items ?? []).map((i) => i.id));
    try {
      try {
        await run([
          {
            key: "initiate",
            run: async () => {
              await sdk.admin.orderEdit.initiateRequest({
                order_id: order.id,
                description: POST_SALE_EDIT_DESCRIPTION,
              });
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
        await fulfilNewItems(order.id, linesBefore);
      } catch (error) {
        void logger.error(`Add items fulfilment failed: ${safeStringify(error)}`);
        toast.warning(t("orders.post_sale.warn_fulfil_failed"));
      }

      if (isUnpaidOrder) {
        printSlip({
          kind: "add",
          orderDisplayId: order.display_id ?? "",
          currency,
          back: [],
          out: slipLines,
          settlement: { direction: "owed", amount: goingOut },
        });
        toast.success(t("orders.post_sale.add_success_unpaid"));
        onClose();
        return;
      }

      setPhase("settle");
      let charged: number;
      try {
        charged = await settle(order.id, selectedMethod);
      } catch (error) {
        void logger.error(`Add items settlement failed: ${safeStringify(error)}`);
        handleErrorToast(t("orders.post_sale.warn_settle_failed"));
        onClose();
        return;
      }

      // The money is recorded; nothing below may report it as not taken.
      try {
        if (isCash) {
          await recordCash(
            order,
            "payin",
            charged,
            t("orders.post_sale.movement_payment", { id: order.display_id })
          );
          openDrawer();
        }
        printSlip({
          kind: "add",
          orderDisplayId: order.display_id ?? "",
          currency,
          back: [],
          out: slipLines,
          settlement: {
            direction: "pays",
            amount: charged,
            method: getPaymentMethodLabel(store, selectedMethod),
          },
        });
      } catch (error) {
        void logger.error(`Add items after-payment step failed: ${safeStringify(error)}`);
      }
      toast.success(
        t("orders.post_sale.add_success", { amount: formatPrice(charged, currency) })
      );
      onClose();
    } finally {
      setPhase(null);
      setIsBusy(false);
    }
  }, [
    isBusy,
    canConfirm,
    isUnpaidOrder,
    lines,
    selectedMethod,
    store,
    isCashBlocked,
    run,
    order,
    settle,
    recordCash,
    openDrawer,
    printSlip,
    slipLines,
    goingOut,
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
    canConfirm,
    isUnpaidOrder,
    isBusy,
    progressLabel: progressKey ? t(`orders.post_sale.step_${progressKey}`) : null,
  };
};

export { useAddItems };
