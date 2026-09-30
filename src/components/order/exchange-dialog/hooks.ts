import { useCallback, useMemo, useState } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { getSdk } from "@/config/medusa";
import { useTranslation } from "@/i18n";
import { formatPrice, getOrderCurrency, handleErrorToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import storage from "@/utils/storage";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQueryProducts } from "@/hooks/queries/useQueryProducts";
import { useQueryShippingOption } from "@/hooks/queries/useQueryShippingOption";
import { useSalesChannel } from "@/context/sales-channel";
import { describeChangeError, useOrderChange } from "@/hooks/order/useOrderChange";
import { useSettleOutstanding } from "@/hooks/order/useSettleOutstanding";
import { usePostSaleCash } from "@/hooks/order/usePostSaleCash";
import { usePostSaleSlip } from "@/hooks/order/usePostSaleSlip";
import type { PostSaleSlipDraft } from "@/utils/pos/receipt/post-sale-slip";
import { useReturnSelection } from "../return-lines/hooks";
import { useOutboundLines } from "../outbound-lines/hooks";
import { receiveReturnSteps } from "@/utils/pos/order-change/return-steps";
import { fulfilNewItems } from "@/utils/pos/order-processing";
import { pickPickupOption } from "@/utils/pos/fulfillment";
import { getOrderPaymentProviderId, getPaymentMethodLabel } from "@/utils/pos/payment";
import { getMethodType, getPaymentMethods } from "@/utils/settings/store/metadata";

const useExchangeItems = (
  order: AdminOrder,
  isOpen: boolean,
  onClose: () => void,
  onExchanged: (outstanding: number, slip: PostSaleSlipDraft) => void
) => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const { data: products = [] } = useQueryProducts(salesChannelId);
  const { data: shippingOptions } = useQueryShippingOption();
  const { run, currentStep } = useOrderChange(order.id);
  const settle = useSettleOutstanding();
  const { record: recordCash, openDrawer, isCashBlocked } = usePostSaleCash();
  const printSlip = usePostSaleSlip();
  const back = useReturnSelection(order);
  const out = useOutboundLines();

  const methods = useMemo(() => getPaymentMethods(store), [store]);
  const defaultMethod = () => getOrderPaymentProviderId(order) ?? methods[0]?.id ?? "";
  const [selectedMethod, setSelectedMethod] = useState<string>(defaultMethod);
  const [phase, setPhase] = useState<"fulfil" | "settle" | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Fresh dialog on every open (React's alternative to a reset effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      back.reset();
      out.reset();
      setSelectedMethod(defaultMethod());
      setPhase(null);
    }
  }

  const currency = getOrderCurrency(order);
  const canConfirm = back.plan.request.length > 0 && out.lines.length > 0;

  const handleConfirm = useCallback(async () => {
    if (isBusy || !canConfirm) return;

    const pickup = pickPickupOption(shippingOptions);
    if (!pickup) {
      handleErrorToast(t("orders.post_sale.no_shipping_option"));
      return;
    }
    const isCash = getMethodType(store, selectedMethod) === "cash";
    // The estimate says who pays; a cash top-up needs an open register.
    if (isCash && isCashBlocked && out.goingOut > back.comingBack) {
      handleErrorToast(t("checkout.register_closed"));
      return;
    }

    setIsBusy(true);
    const sdk = getSdk();
    const collectionsBefore = new Set((order.payment_collections ?? []).map((c) => c.id));
    const linesBefore = new Set((order.items ?? []).map((i) => i.id));
    let exchangeId = "";
    let returnId = "";
    try {
      let outstanding: number;
      try {
        const locationId = await storage.getItem("stock_location_id");
        outstanding = await run([
          {
            key: "exchange_create",
            run: async () => {
              const { exchange } = await sdk.admin.exchange.create({ order_id: order.id });
              exchangeId = exchange.id;
            },
            undo: async () => {
              await sdk.admin.exchange.cancelRequest(exchangeId);
            },
          },
          {
            key: "add_inbound",
            run: async () => {
              await sdk.admin.exchange.addInboundItems(exchangeId, {
                items: back.plan.request,
                ...(locationId ? { location_id: locationId } : {}),
              });
            },
          },
          {
            key: "add_outbound",
            run: async () => {
              await sdk.admin.exchange.addOutboundItems(exchangeId, {
                items: out.lines.map((l) => ({ variant_id: l.variant.id, quantity: l.quantity })),
              });
            },
          },
          {
            // Without it the request succeeds but reserves no stock, so nothing can be handed over (spike S9).
            key: "add_shipping",
            run: async () => {
              await sdk.admin.exchange.addOutboundShipping(exchangeId, {
                shipping_option_id: pickup.id,
              });
            },
          },
          {
            key: "exchange_request",
            run: async () => {
              await sdk.admin.exchange.request(exchangeId, { no_notification: true });
              const { exchange } = await sdk.admin.exchange.retrieve(exchangeId, {
                fields: "id,return_id",
              });
              returnId = exchange.return_id ?? "";
              if (!returnId) throw new Error("The exchange has no return to receive");
            },
            // Cancel leaves the request's payment collection behind as not_paid (verified on staging).
            undo: async () => {
              await sdk.admin.exchange.cancel(exchangeId);
              const { order: after } = await sdk.admin.order.retrieve(order.id, {
                fields: "id,*payment_collections",
              });
              for (const c of after.payment_collections ?? []) {
                if (!collectionsBefore.has(c.id) && c.status === "not_paid") {
                  await sdk.admin.paymentCollection.delete(c.id);
                }
              }
            },
            replacesUndo: true,
          },
          ...receiveReturnSteps(() => returnId, back.plan),
        ]);
      } catch (error) {
        void logger.error(`Exchange failed: ${safeStringify(error)}`);
        handleErrorToast(describeChangeError(error, order, t));
        return;
      }

      // The new goods are in the customer's hands; a failure here must not stop settling.
      setPhase("fulfil");
      try {
        await fulfilNewItems(order.id, linesBefore);
      } catch (error) {
        void logger.error(`Exchange fulfilment failed: ${safeStringify(error)}`);
        toast.warning(t("orders.post_sale.warn_fulfil_failed"));
      }

      const slip: PostSaleSlipDraft = {
        kind: "exchange",
        orderDisplayId: order.display_id ?? "",
        currency,
        back: back.slipLines,
        out: out.slipLines,
      };

      if (outstanding > 0) {
        setPhase("settle");
        let charged: number | null = null;
        try {
          charged = await settle(order.id, selectedMethod);
        } catch (error) {
          void logger.error(`Exchange settlement failed: ${safeStringify(error)}`);
          handleErrorToast(t("orders.post_sale.warn_settle_failed"));
        }

        if (charged !== null) {
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
              ...slip,
              settlement: {
                direction: "pays",
                amount: charged,
                method: getPaymentMethodLabel(store, selectedMethod),
              },
            });
          } catch (error) {
            void logger.error(`Exchange after-payment step failed: ${safeStringify(error)}`);
          }
          toast.success(
            `${t("orders.post_sale.exchange_success")} · ${t("orders.post_sale.direction_pays", {
              amount: formatPrice(charged, currency),
            })}`
          );
        }
      } else {
        toast.success(t("orders.post_sale.exchange_success"));
        if (Math.abs(outstanding) < 0.005) printSlip({ ...slip, settlement: { direction: "even" } });
      }

      onClose();
      // Owed money: the slip prints once the refund says how it was paid back.
      if (outstanding < 0) onExchanged(outstanding, slip);
    } finally {
      setPhase(null);
      setIsBusy(false);
    }
  }, [
    isBusy,
    canConfirm,
    shippingOptions,
    store,
    selectedMethod,
    isCashBlocked,
    out,
    back,
    order,
    run,
    settle,
    recordCash,
    openDrawer,
    printSlip,
    currency,
    onClose,
    onExchanged,
    t,
  ]);

  const progressKey = phase ?? currentStep;

  return {
    products,
    currency,
    back,
    out,
    methods,
    selectedMethod,
    setSelectedMethod,
    canConfirm,
    handleConfirm,
    isBusy,
    progressLabel: progressKey ? t(`orders.post_sale.step_${progressKey}`) : null,
  };
};

export { useExchangeItems };
