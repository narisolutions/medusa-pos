import { logger, safeStringify } from "@/utils/logger";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { toast } from "sonner";
import { queryClient, queryKeys } from "@/config/query";
import { getSdk } from "@/config/medusa";
import { playErrorSound, playSuccessSound } from "@/utils/sounds";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { AdminOrder, AdminDraftOrder } from "@medusajs/types";
import { useCartStore } from "@/context/cart";
import { useRegister } from "@/context/register";
import { PaymentMethod } from "@/types/utils";
import { useCheckout } from "../hooks";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useOrderProcessing } from "@/hooks/order/useOrderProcessing";
import { getPaymentMethods, getMethodType } from "@/utils/settings/store/metadata";
import { getCashRounding, roundCashAmount } from "@/utils/settings/preferences";
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
  // Monotonic sequence so a late-resolving fetch can't overwrite a newer result
  // (fetchDraftOrder is also called directly, outside the effect below).
  const fetchSeqRef = useRef(0);

  const fetchDraftOrder = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
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

      if (seq === fetchSeqRef.current) setDraftOrder(draft_order);
      return draft_order;
    } catch (error) {
      void logger.error(`Failed to fetch draft order: ${safeStringify(error)}`);
      if (seq === fetchSeqRef.current) setDraftOrder(null);
      return null;
    }
  }, [draftOrderId]);

  const shouldLoad = !!draftOrderId && !!isOpen;
  useChange(shouldLoad, () => {
    if (!shouldLoad) setDraftOrder(null);
  });

  useEffect(() => {
    if (!draftOrderId || !isOpen) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) fetchDraftOrder();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, draftOrderId, fetchDraftOrder]);

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

const useCashPayment = (total: number, isCashType: boolean) => {
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
    isCashType && customerPaid
      ? (parseFloat(customerPaid) || 0) - total
      : 0;

  const canProcessPayment =
    isCashType
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

const usePaymentModal = (
  draftOrderId?: string | null,
  onClose?: () => void,
  isOpen?: boolean
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  // Single-flight guard: a ref (not state) so a double-tap can't convert the draft twice.
  const submissionRef = useRef(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPayLaterConfirmation, setShowPayLaterConfirmation] =
    useState(false);
  // Total snapshotted at submit — clearing draftOrderId mid-flow would show 0.00 otherwise.
  const [frozenTotal, setFrozenTotal] = useState<number | null>(null);

  const { printOrderReceipt, openCashDrawer, getDefaultPrinter } = usePrinterService();
  const clearItems = useCartStore((state) => state.clearItems);
  const setDraftOrderId = useCartStore((state) => state.setDraftOrderId);
  const { selectedPaymentMethod, setPaymentMethod } = useCheckout();
  const { isOpen: registerOpen, session: registerSession } = useRegister();
  // Stamp orders with the active register session so cash reconciliation can
  // attribute them exactly (falls back to the created_at window when absent).
  const registerSessionId = registerOpen ? registerSession?.id : undefined;
  const items = useCartStore((state) => state.items);

  // Get payment method display info
  const paymentMethodInfo = usePaymentMethodDisplay(selectedPaymentMethod);
  const { data: store } = useQueryStore();
  const isCashType = getMethodType(store, selectedPaymentMethod) === "cash";

  // Compose sub-hooks
  const { draftOrder, fetchDraftOrder } = useDraftOrderState(
    draftOrderId,
    isOpen
  );
  const calculations = useOrderCalculations(draftOrder);

  // Swedish rounding: cash tenders round to the configured increment (card stays exact);
  // Medusa's total is untouched — the rounded figure drives change + reconciliation metadata.
  const roundingActive =
    isCashType && getCashRounding().enabled;
  const cashTotal = roundingActive
    ? roundCashAmount(calculations.total)
    : calculations.total;

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
  } = useCashPayment(cashTotal, isCashType);
  const { processPaymentCollection, processFulfillment } = useOrderProcessing();

  // While processing, the draft order is cleared (so its total reads 0). Show the
  // frozen snapshot taken at submit time so the amount never flashes to 0.00.
  const displayTotal =
    isProcessing && frozenTotal != null ? frozenTotal : calculations.total;

  // Rounded cash amount to collect (cash + rounding on); card shows exact total.
  const cashDue = roundingActive ? roundCashAmount(displayTotal) : displayTotal;

  // Fire-and-forget: print receipt + open cash drawer after order succeeds.
  // Runs independently so it never blocks the modal from closing.
  const runPostOrderHardware = useCallback(
    (order: AdminOrder, paymentMethod: PaymentMethod | undefined) => {
      const defaultPrinter = getDefaultPrinter();

      printOrderReceipt(order).catch((printError) => {
        void logger.warn(`Auto-print failed: ${safeStringify(printError)}`);
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
        const isCash = getMethodType(store, paymentMethod) === "cash";
        const isCard = !isCash && paymentMethod !== undefined;
        if (
          (isCash && defaultPrinter.openCashDrawerOnCash) ||
          (isCard && defaultPrinter.openCashDrawerOnCard)
        ) {
          openCashDrawer(defaultPrinter).catch((drawerError) => {
            void logger.warn(`Auto cash drawer failed: ${safeStringify(drawerError)}`);
            toast.error("The cash drawer did not open", {
              description: cashDrawerIssueStaffHintToast(defaultPrinter.name),
            });
          });
        }
      }
    },
    [store, printOrderReceipt, openCashDrawer, getDefaultPrinter]
  );

  // Clean up after successful order — synchronous-ish: clears cart, resets
  // state, shows success toast. Hardware side effects are fire-and-forget.
  const cleanupAfterOrder = useCallback(
    async (
      order: AdminOrder,
      paymentMethod: PaymentMethod | undefined,
      options?: { successMessage?: string }
    ): Promise<void> => {
      clearItems();
      setDraftOrderId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      resetCashState();
      setPaymentMethod(undefined);

      toast.success(
        options?.successMessage ??
          `Order #${order.display_id} created successfully!`
      );
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
      if (submissionRef.current) {
        return null;
      }
      if (!draftOrderId) {
        handleErrorToast("No order prepared. Please create order first.");
        playErrorSound();
        return null;
      }
      if (!selectedPaymentMethod) {
        handleErrorToast("No payment method selected.");
        playErrorSound();
        return null;
      }
      if (!canProcessPayment) {
        playErrorSound();
        handleErrorToast("Insufficient payment amount");
        return null;
      }

      submissionRef.current = true;
      setFrozenTotal(calculations.total);
      setIsProcessing(true);

      // Tracks whether the draft order has already been consumed by convertToOrder.
      // Used in the catch block to decide whether to close the modal on error.
      let orderConversionDone = false;

      try {
        const sdk = getSdk();

        // Step 1: Patch draft metadata — cash_paid (cash only) and register_session_id
        // (whenever a register is open). Single round-trip when either applies.
        const metadataPatch: Record<string, unknown> = {};
        if (isCashType && customerPaid) {
          metadataPatch.cash_paid = parseFloat(customerPaid) || 0;
        }
        // Stamp the rounded cash actually collected so reconciliation and the
        // receipt use the drawer figure, not the exact (un-rounded) order total.
        if (roundingActive) {
          metadataPatch.cash_collected = roundCashAmount(calculations.total);
        }
        if (registerSessionId) {
          metadataPatch.register_session_id = registerSessionId;
        }
        if (Object.keys(metadataPatch).length > 0) {
          const { draft_order } = await sdk.admin.draftOrder.retrieve(draftOrderId!);
          const currentMetadata = (draft_order.metadata || {}) as Record<string, unknown>;
          await sdk.admin.draftOrder.update(draftOrderId!, {
            metadata: { ...currentMetadata, ...metadataPatch },
          });
        }

        // Step 2: Convert draft → order
        const { order: convertedOrder } = await sdk.admin.draftOrder.convertToOrder(draftOrderId!);

        // CRITICAL: draft is now consumed. Clear the ID immediately so that no
        // subsequent error path can leave a stale draft order ID in state.
        setDraftOrderId(null);
        orderConversionDone = true;

        // Step 3: Fetch full order with expanded payment/fulfillment fields
        const { order } = await sdk.admin.order.retrieve(convertedOrder.id, {
          fields:
            "*payment_collections,*payment_collections.payments,*summary,*fulfillments,*items,*customer,*sales_channel,*shipping_methods",
        });

        // Step 4: Process payment collection
        let finalOrder = order;
        try {
          await processPaymentCollection(order, selectedPaymentMethod);
        } catch {
          // Re-fetch the order to check whether payment was captured on the backend
          // despite the frontend error (e.g. empty-body response).
          let paymentWasCaptured = false;
          try {
            const { order: refreshed } = await sdk.admin.order.retrieve(order.id, {
              fields: "payment_status",
            });
            paymentWasCaptured =
              refreshed.payment_status === "captured" ||
              refreshed.payment_status === "authorized";

            if (paymentWasCaptured) {
              const { order: fullRefreshed } = await sdk.admin.order.retrieve(order.id, {
                fields:
                  "*payment_collections,*payment_collections.payments,*summary,*fulfillments,*items,*customer,*sales_channel,*shipping_methods",
              });
              finalOrder = fullRefreshed;
            }
          } catch {
            // ignore — handled below by paymentWasCaptured === false
          }

          if (!paymentWasCaptured) {
            try {
              await sdk.admin.order.cancel(order.id);
            } catch {
              throw new Error(
                `Payment failed and order #${order.display_id} could not be cancelled. Please resolve it in the admin panel.`
              );
            }
            throw new Error("Payment processing failed. Please try again.");
          }
        }

        // Step 5: Process fulfillment (errors are non-fatal — shows toast but doesn't throw)
        await processFulfillment(finalOrder);

        // Step 6: Complete the order (non-fatal)
        try {
          await sdk.admin.order.complete(finalOrder.id, {});
        } catch {
          // non-fatal
        }

        // Step 7: Clean up and finalize
        await cleanupAfterOrder(finalOrder, selectedPaymentMethod);
        return finalOrder;

      } catch (error) {
        playErrorSound();
        handleErrorToast(
          error instanceof Error ? error.message : "Failed to create order. Please try again."
        );

        // If the draft was already converted when the error occurred, close the modal
        // so the user can start a fresh checkout. Cart items are preserved.
        if (orderConversionDone) {
          onClose?.();
        }

        return null;
      } finally {
        submissionRef.current = false;
        setIsProcessing(false);
      }
    }, [
      draftOrderId,
      canProcessPayment,
      isCashType,
      roundingActive,
      selectedPaymentMethod,
      customerPaid,
      calculations.total,
      processPaymentCollection,
      processFulfillment,
      cleanupAfterOrder,
      setDraftOrderId,
      registerSessionId,
      onClose,
    ]);

  // Pay later: fulfill but skip capture — the uncaptured order IS the "outstanding" signal,
  // so never cancel on failure and never complete.
  const handleDeliverPayLater =
    useCallback(async (): Promise<AdminOrder | null> => {
      if (submissionRef.current) {
        return null;
      }
      if (!draftOrderId) {
        handleErrorToast("No order prepared. Please create order first.");
        playErrorSound();
        return null;
      }

      submissionRef.current = true;
      setFrozenTotal(calculations.total);
      setIsProcessing(true);

      // Tracks whether convertToOrder has consumed the draft (controls modal close on error).
      let orderConversionDone = false;

      try {
        const sdk = getSdk();

        // Step 1: Flag the draft as pay-later so the order, receipt and orders
        // list can detect it. Mirrors the cash_paid metadata patch above.
        const { draft_order } =
          await sdk.admin.draftOrder.retrieve(draftOrderId);
        const currentMetadata = (draft_order.metadata || {}) as Record<
          string,
          unknown
        >;
        await sdk.admin.draftOrder.update(draftOrderId, {
          metadata: {
            ...currentMetadata,
            pay_later: true,
            ...(registerSessionId ? { register_session_id: registerSessionId } : {}),
          },
        });

        // Step 2: Convert draft → order, then clear the id immediately.
        const { order: convertedOrder } =
          await sdk.admin.draftOrder.convertToOrder(draftOrderId);
        setDraftOrderId(null);
        orderConversionDone = true;

        // Step 3: Fetch full order with expanded fields.
        const { order } = await sdk.admin.order.retrieve(convertedOrder.id, {
          fields:
            "*payment_collections,*payment_collections.payments,*summary,*fulfillments,*items,*customer,*sales_channel,*shipping_methods",
        });

        // Step 4: Deliver now (decrements inventory). Skip payment capture and
        // order.complete; do NOT cancel on any failure.
        await processFulfillment(order);

        // Step 5: Clean up and finalize with an "outstanding" toast.
        await cleanupAfterOrder(order, selectedPaymentMethod, {
          successMessage: `Order #${order.display_id} delivered — payment outstanding`,
        });
        return order;
      } catch (error) {
        playErrorSound();
        handleErrorToast(
          error instanceof Error
            ? error.message
            : "Failed to create order. Please try again."
        );

        // Never cancel a pay-later order. If the draft was already converted,
        // close so the cashier can continue; the order is in the orders list.
        if (orderConversionDone) {
          onClose?.();
        }

        return null;
      } finally {
        submissionRef.current = false;
        setIsProcessing(false);
      }
    }, [
      draftOrderId,
      selectedPaymentMethod,
      calculations.total,
      processFulfillment,
      cleanupAfterOrder,
      setDraftOrderId,
      registerSessionId,
      onClose,
    ]);

  // Handle modal close
  const handleClose = useCallback(() => {
    resetCashState();
    setFrozenTotal(null);
    setShowConfirmation(false);
    setShowPayLaterConfirmation(false);
    onClose?.();
  }, [resetCashState, onClose]);

  // Open the pay-later confirmation dialog.
  const handleDeliverPayLaterClick = useCallback(() => {
    setShowPayLaterConfirmation(true);
  }, []);

  // Confirm pay-later from the confirmation dialog.
  const handleConfirmPayLater = useCallback(async (): Promise<void> => {
    const result = await handleDeliverPayLater();
    if (result) {
      setShowPayLaterConfirmation(false);
      handleClose();
    }
  }, [handleDeliverPayLater, handleClose]);

  // Handle complete button click
  const handleCompleteClick = useCallback(() => {
    const isCardPayment = !isCashType;

    if (isCardPayment) {
      setShowConfirmation(true);
    } else {
      handleProcessPayment().then((result) => {
        if (result) {
          handleClose();
        }
      });
    }
  }, [isCashType, handleProcessPayment, handleClose]);

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
    showPayLaterConfirmation,

    // Calculations
    ...calculations,
    // Keep the confirmed amount visible during submission instead of 0.00.
    total: displayTotal,
    // Cash rounding: amount to collect (rounded) vs the exact total.
    cashDue,
    cashRoundingActive: roundingActive,

    // Computed values
    cartItemsCount: calculations.itemCount,
    canProcessPayment,
    change,
    quickAmounts,
    items,
    paymentMethodInfo,
    isCashPayment: isCashType,

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
    handleDeliverPayLater,
    handleDeliverPayLaterClick,
    handleConfirmPayLater,
    setShowPayLaterConfirmation,
    fetchDraftOrder,
    billCounts,
  };
};

export { usePaymentModal };
