import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { queryClient } from "@/config/query";
import { getSdk } from "@/config/medusa";
import { playErrorSound, playSuccessSound } from "@/utils/sounds";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { AdminOrder, AdminDraftOrder } from "@medusajs/types";
import { useCartStore } from "@/context/cart";
import { PaymentMethod } from "@/types/utils";
import { useCheckout } from "../hooks";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getPaymentMethods } from "@/utils/settings/store/metadata";
import constants from "@/utils/constants";
import { CreditCard, Banknote } from "lucide-react";
import {
  cashDrawerIssueStaffHintToast,
  handleErrorToast,
  printerIssueStaffHintToast,
} from "@/utils/helpers";

const iconByType = {
  cash: Banknote,
  card: CreditCard,
} as const;

const usePaymentMethodDisplay = (selectedPaymentMethod?: PaymentMethod) => {
  const { data: store } = useQueryStore();
  return useMemo(() => {
    const methods = getPaymentMethods(store);
    const found = methods.find((m) => m.id === selectedPaymentMethod);
    if (found) {
      const Icon = iconByType[found.icon ?? "card"];
      return { label: found.label, icon: Icon };
    }
    return { label: "Unknown", icon: CreditCard };
  }, [store, selectedPaymentMethod]);
};

const useDraftOrderState = (draftOrderId?: string | null, isOpen?: boolean) => {
  const [draftOrder, setDraftOrder] = useState<AdminDraftOrder | null>(null);

  const fetchDraftOrder = async () => {
    if (!draftOrderId) {
      setDraftOrder(null);
      return null;
    }

    try {
      const sdk = getSdk();
      const { draft_order } = await sdk.admin.draftOrder.retrieve(
        draftOrderId,
        {
          fields:
            "*items,*summary,*region,*sales_channel,subtotal,discount_total,tax_total,total",
        }
      );

      setDraftOrder(draft_order);
      return draft_order;
    } catch (error) {
      console.error("Failed to fetch draft order:", error);
      setDraftOrder(null);
      return null;
    }
  };

  useEffect(() => {
    if (!draftOrderId || !isOpen) {
      setDraftOrder(null);
      return;
    }

    fetchDraftOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftOrderId]);

  return { draftOrder, fetchDraftOrder };
};

const useOrderCalculations = (draftOrder: AdminDraftOrder | null) => {
  if (!draftOrder) {
    return {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      itemCount: 0,
    };
  }

  const subtotal = draftOrder.subtotal || 0;
  const discount = draftOrder.discount_total || 0;
  const tax = draftOrder.tax_total || 0;
  const total = draftOrder.total || 0;
  const itemCount =
    draftOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  return { subtotal, discount, tax, total, itemCount };
};

const useCashPayment = (
  total: number,
  selectedPaymentMethod?: PaymentMethod
) => {
  const [customerPaid, setCustomerPaid] = useState<string>("");
  const [billCounts, setBillCounts] = useState<Record<number, number>>({});

  const handleCashValueChange = (value: string) => {
    setCustomerPaid(value);
    // Reset bill counts when manually entering a value
    if (value === "" || value === "0") {
      setBillCounts({});
    }
  };

  const handleQuickAmount = (amount: number, remove: boolean = false) => {
    if (remove) {
      // Remove one bill of this amount
      setCustomerPaid((prev) => {
        const currentPaid = parseFloat(prev) || 0;
        return Math.max(0, currentPaid - amount).toString();
      });

      setBillCounts((prev) => {
        const currentCount = prev[amount] || 0;
        if (currentCount > 0) {
          const newCount = currentCount - 1;
          if (newCount <= 0) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [amount]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [amount]: newCount };
        }
        return prev;
      });
    } else {
      // Add the amount to the current total
      setCustomerPaid((prev) => {
        const currentPaid = parseFloat(prev) || 0;
        return (currentPaid + amount).toString();
      });

      // Update bill count
      setBillCounts((prev) => ({
        ...prev,
        [amount]: (prev[amount] || 0) + 1,
      }));
    }
  };

  const handleClearBillCounts = () => {
    setBillCounts({});
    setCustomerPaid("");
  };

  const handleExactAmount = () => {
    setCustomerPaid(total.toString());
    setBillCounts({});
  };

  const change =
    selectedPaymentMethod === "pp_cash_pos" && customerPaid
      ? (parseFloat(customerPaid) || 0) - total
      : 0;

  const canProcessPayment =
    selectedPaymentMethod === "pp_cash_pos"
      ? (parseFloat(customerPaid) || 0) >= total
      : true;

  const resetCashState = () => {
    setCustomerPaid("");
    setBillCounts({});
  };

  return {
    customerPaid,
    change,
    canProcessPayment,
    handleCashValueChange,
    handleQuickAmount,
    handleClearBillCounts,
    handleExactAmount,
    resetCashState,
    billCounts,
    quickAmounts: constants.QUICK_CASH_AMOUNTS,
  };
};

const useOrderProcessing = () => {
  const processPaymentCollection = useCallback(
    async (order: AdminOrder): Promise<void> => {
      const sdk = getSdk();

      if (
        order.payment_status === "captured" ||
        order.payment_status === "authorized"
      ) {
        return;
      }

      if (order.payment_collections && order.payment_collections.length > 0) {
        const existingPaymentCollection = order.payment_collections[0];
        await sdk.admin.paymentCollection.markAsPaid(
          existingPaymentCollection.id,
          { order_id: order.id }
        );
        return;
      }

      const paymentAmount = order.summary?.accounting_total || order.total || 0;
      const { payment_collection } = await sdk.admin.paymentCollection.create({
        order_id: order.id,
        amount: paymentAmount,
      });

      await sdk.admin.paymentCollection.markAsPaid(payment_collection.id, {
        order_id: order.id,
      });
    },
    []
  );

  const processFulfillment = useCallback(
    async (order: AdminOrder): Promise<void> => {
      const sdk = getSdk();

      if (
        order.fulfillment_status === "fulfilled" ||
        order.fulfillment_status === "shipped" ||
        order.fulfillment_status === "delivered"
      ) {
        return;
      }

      try {
        if (order.fulfillments && order.fulfillments.length > 0) {
          const existingFulfillment = order.fulfillments[0];
          await sdk.admin.order.markAsDelivered(
            order.id,
            existingFulfillment.id
          );
          return;
        }

        const itemsToFulfill =
          order.items?.map((item) => ({
            id: item.id,
            quantity: item.quantity || 1,
          })) || [];

        if (itemsToFulfill.length === 0) {
          return;
        }

        const response = await sdk.admin.order.createFulfillment(order.id, {
          items: itemsToFulfill,
          no_notification: true,
        });

        let fulfillmentId = response.order?.fulfillments?.[0]?.id;

        if (!fulfillmentId) {
          const { order: refreshedOrder } = await sdk.admin.order.retrieve(
            order.id,
            { fields: "*fulfillments" }
          );
          fulfillmentId = refreshedOrder.fulfillments?.[0]?.id;
        }

        if (!fulfillmentId) {
          throw new Error("Failed to get fulfillment ID");
        }

        await sdk.admin.order.markAsDelivered(order.id, fulfillmentId);
      } catch (error) {
        handleErrorToast(
          `Warning: Fulfillment failed (${error instanceof Error ? error.message : "Unknown"}), but order created`
        );
      }
    },
    []
  );

  return { processPaymentCollection, processFulfillment };
};

const usePaymentModal = (
  draftOrderId?: string | null,
  onClose?: () => void,
  isOpen?: boolean
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { printOrderReceipt, openCashDrawer, getDefaultPrinter } = usePrinterService();
  const { clearItems, setDraftOrderId } = useCartStore();
  const { selectedPaymentMethod, setPaymentMethod } = useCheckout();
  const items = useCartStore((state) => state.items);

  // Get payment method display info
  const paymentMethodInfo = usePaymentMethodDisplay(selectedPaymentMethod);

  // Compose sub-hooks
  const { draftOrder, fetchDraftOrder } = useDraftOrderState(
    draftOrderId,
    isOpen
  );
  const calculations = useOrderCalculations(draftOrder);
  const {
    customerPaid,
    change,
    canProcessPayment,
    handleCashValueChange,
    handleQuickAmount,
    handleClearBillCounts,
    handleExactAmount,
    resetCashState,
    billCounts,
    quickAmounts,
  } = useCashPayment(calculations.total, selectedPaymentMethod);
  const { processPaymentCollection, processFulfillment } = useOrderProcessing();

  // Fire-and-forget: print receipt + open cash drawer after order succeeds.
  // Runs independently so it never blocks the modal from closing.
  const runPostOrderHardware = useCallback(
    (order: AdminOrder, paymentMethod: PaymentMethod | undefined) => {
      const defaultPrinter = getDefaultPrinter();

      printOrderReceipt(order).catch((printError) => {
        console.warn("Auto-print failed:", printError);
        if (defaultPrinter) {
          toast.error("The receipt did not print", {
            description: printerIssueStaffHintToast(defaultPrinter.name),
          });
        } else {
          toast.error("The receipt did not print", {
            description:
              "No default printer is set. Add one under Settings → Printers.",
          });
        }
      });

      if (defaultPrinter?.openCashDrawer) {
        const isCash = paymentMethod === "pp_cash_pos";
        const isCard = !isCash && paymentMethod !== undefined;
        if (
          (isCash && defaultPrinter.openCashDrawerOnCash) ||
          (isCard && defaultPrinter.openCashDrawerOnCard)
        ) {
          openCashDrawer(defaultPrinter).catch((drawerError) => {
            console.warn("Auto cash drawer failed:", drawerError);
            toast.error("The cash drawer did not open", {
              description: cashDrawerIssueStaffHintToast(defaultPrinter.name),
            });
          });
        }
      }
    },
    [printOrderReceipt, openCashDrawer, getDefaultPrinter]
  );

  // Clean up after successful order — synchronous-ish: clears cart, resets
  // state, shows success toast. Hardware side effects are fire-and-forget.
  const cleanupAfterOrder = useCallback(
    async (order: AdminOrder, paymentMethod: PaymentMethod | undefined): Promise<void> => {
      clearItems();
      setDraftOrderId(null);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });

      resetCashState();
      setPaymentMethod(undefined);

      toast.success(`Order #${order.display_id} created successfully!`);
      playSuccessSound();

      runPostOrderHardware(order, paymentMethod);
    },
    [
      clearItems,
      setDraftOrderId,
      resetCashState,
      setPaymentMethod,
      runPostOrderHardware,
    ]
  );

  // Main payment processing flow
  const handleProcessPayment =
    useCallback(async (): Promise<AdminOrder | null> => {
      // Validate payment before processing
      if (!draftOrderId) {
        handleErrorToast("No order prepared. Please create order first.");
        playErrorSound();
        return null;
      }

      if (!canProcessPayment) {
        playErrorSound();
        handleErrorToast("Insufficient payment amount");
        return null;
      }

      setIsProcessing(true);

      try {
        const sdk = getSdk();

        // Update draft order metadata with cash_paid if payment method is cash
        if (selectedPaymentMethod === "pp_cash_pos" && customerPaid) {
          const cashPaidAmount = parseFloat(customerPaid) || 0;

          const { draft_order } = await sdk.admin.draftOrder.retrieve(draftOrderId!);
          const currentMetadata = (draft_order.metadata || {}) as Record<string, unknown>;

          await sdk.admin.draftOrder.update(draftOrderId!, {
            metadata: {
              ...currentMetadata,
              cash_paid: cashPaidAmount,
            },
          });
        }

        const { order: convertedOrder } =
          await sdk.admin.draftOrder.convertToOrder(draftOrderId!);

        const { order } = await sdk.admin.order.retrieve(convertedOrder.id, {
          fields:
            "*payment_collections,*payment_collections.payments,*summary,*fulfillments,*items,*customer,*sales_channel,*shipping_methods",
        });

        // Step 3: Process payment
        await processPaymentCollection(order);

        // Step 4: Process fulfillment
        await processFulfillment(order);

        // Step 5: Clean up and finalize
        await cleanupAfterOrder(order, selectedPaymentMethod);

        return order;
      } catch (error) {
        playErrorSound();

        if (error instanceof Error) {
          if (error.message.includes("Payment collection")) {
            handleErrorToast(
              "Payment processing failed. Please verify payment status."
            );
          } else if (error.message.includes("payment")) {
            handleErrorToast(
              "Payment configuration error. Check payment provider."
            );
          } else {
            handleErrorToast(`Order creation failed: ${error.message}`);
          }
        } else {
          handleErrorToast("Failed to create order. Please try again.");
        }

        return null;
      } finally {
        setIsProcessing(false);
      }
    }, [
      draftOrderId,
      canProcessPayment,
      selectedPaymentMethod,
      customerPaid,
      processPaymentCollection,
      processFulfillment,
      cleanupAfterOrder,
    ]);

  // Handle modal close
  const handleClose = useCallback(() => {
    resetCashState();
    setShowConfirmation(false);
    onClose?.();
  }, [resetCashState, onClose]);

  // Handle complete button click
  const handleCompleteClick = useCallback(() => {
    const isCardPayment =
      selectedPaymentMethod === "pp_tbc_pos" ||
      selectedPaymentMethod === "pp_bank-of-georgia_pos";

    if (isCardPayment) {
      setShowConfirmation(true);
    } else {
      handleProcessPayment().then((result) => {
        if (result) {
          handleClose();
        }
      });
    }
  }, [selectedPaymentMethod, handleProcessPayment, handleClose]);

  // Handle complete payment with modal close (legacy, kept for backwards compatibility)
  const handleCompletePayment = useCallback(async (): Promise<void> => {
    const result = await handleProcessPayment();
    if (result) {
      handleClose();
    }
  }, [handleProcessPayment, handleClose]);

  // Handle confirmation modal confirm
  const handleConfirmPayment = useCallback(async (): Promise<void> => {
    const result = await handleProcessPayment();
    if (result) {
      setShowConfirmation(false);
      handleClose();
    }
  }, [handleProcessPayment, handleClose]);

  return {
    // State
    selectedPaymentMethod,
    customerPaid,
    isProcessing,
    draftOrder,
    showConfirmation,

    // Calculations
    ...calculations,

    // Computed values
    cartItemsCount: calculations.itemCount,
    canProcessPayment,
    change,
    quickAmounts,
    items,
    paymentMethodInfo,
    isCashPayment: selectedPaymentMethod === "pp_cash_pos",

    // Functions
    handleCashValueChange,
    handleProcessPayment,
    handleClose,
    handleQuickAmount,
    handleClearBillCounts,
    handleExactAmount,
    handleCompletePayment,
    handleCompleteClick,
    handleConfirmPayment,
    setShowConfirmation,
    fetchDraftOrder,
    billCounts,
  };
};

export { usePaymentModal };
