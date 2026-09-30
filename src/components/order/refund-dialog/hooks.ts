import { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminOrder } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { useTranslation, t as translate } from "@/i18n";
import schemas from "@/utils/schemas";
import { coercedZodResolver } from "@/utils/schemas/resolver";
import { Forms } from "@/types/form";
import {
  formatPrice,
  getApiErrorMessage,
  getOrderCurrency,
  handleErrorToast,
} from "@/utils/helpers";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQueryRefundReasons } from "@/hooks/queries/useQueryRefundReasons";
import { usePostSaleCash } from "@/hooks/order/usePostSaleCash";
import { getMethodType } from "@/utils/settings/store/metadata";
import {
  allocateRefund,
  getPaymentMethodLabel,
  getRefundablePayments,
} from "@/utils/pos/payment";

/** `lockedAmount`: what a post-sale change left owing; spread across payments, not editable. */
export const useRefund = (
  order: AdminOrder,
  isOpen: boolean,
  onClose: () => void,
  lockedAmount?: number,
  onRefunded?: (amount: number, method: string) => void
) => {
  const isLocked = lockedAmount !== undefined;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: store } = useQueryStore();
  const { data: refundReasons = [] } = useQueryRefundReasons(isOpen);
  const { record: recordCash, openDrawer, isCashBlocked } = usePostSaleCash();

  const [step, setStep] = useState<"form" | "confirm">("form");
  const [isProcessing, setIsProcessing] = useState(false);
  // A refund is irreversible, so a double-tap must never send two requests.
  const submissionRef = useRef(false);

  const payments = useMemo(() => getRefundablePayments(order), [order]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(
    () => payments[0]?.id ?? ""
  );

  const selectedPayment =
    payments.find((payment) => payment.id === selectedPaymentId) ?? payments[0];
  const refundable = isLocked
    ? payments.reduce((sum, payment) => sum + payment.refundable, 0)
    : selectedPayment?.refundable ?? 0;
  const currency = getOrderCurrency(order);
  const allocation = useMemo(
    () => (isLocked ? allocateRefund(payments, lockedAmount) : null),
    [isLocked, payments, lockedAmount]
  );
  const initialAmount = (first?: { refundable: number }) =>
    isLocked ? lockedAmount : first?.refundable ?? 0;

  const form = useForm<Forms["Refund"]>({
    resolver: coercedZodResolver(schemas.refund),
    defaultValues: {
      amount: initialAmount(payments[0]),
      refundReasonId: "",
      note: "",
    },
  });

  const [amountText, setAmountText] = useState(() => {
    const initial = initialAmount(payments[0]);
    return initial > 0 ? String(initial) : "";
  });

  const setAmount = useCallback(
    (value: string) => {
      setAmountText(value);
      form.setValue("amount", Number(value) || 0);
      form.clearErrors("amount");
    },
    [form]
  );

  // Reopening after a partial refund must not prefill the stale amount, so the
  // dialog resets on the closed→open edge (React's alternative to a reset effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      const first = payments[0];
      setStep("form");
      setSelectedPaymentId(first?.id ?? "");
      const initial = initialAmount(first);
      setAmountText(initial > 0 ? String(initial) : "");
      form.reset({
        amount: initial,
        refundReasonId: "",
        note: "",
        });
    }
  }

  const handleSelectPayment = useCallback(
    (paymentId: string) => {
      setSelectedPaymentId(paymentId);
      const next = payments.find((payment) => payment.id === paymentId);
      setAmount(next ? String(next.refundable) : "");
    },
    [payments, setAmount]
  );

  const handleRefundFull = useCallback(() => {
    setAmount(String(refundable));
  }, [refundable, setAmount]);

  // The refundable ceiling depends on the payment, not the form, so it is checked
  // here rather than in the schema — matching the close-register flow.
  const handleValidate = form.handleSubmit((data) => {
    if (!selectedPayment) return;

    if (isLocked && !allocation) {
      form.setError("amount", {
        message: translate("orders.refund_locked_uncovered", {
          available: formatPrice(refundable, currency),
        }),
      });
      return;
    }

    if (data.amount > refundable) {
      form.setError("amount", {
        message: translate("orders.refund_exceeds_refundable"),
      });
      return;
    }

    setStep("confirm");
  });

  const handleConfirm = useCallback(async () => {
    if (submissionRef.current || !selectedPayment) return;
    submissionRef.current = true;
    setIsProcessing(true);

    const { amount, refundReasonId, note } = form.getValues();
    const refunds = allocation ?? [{ id: selectedPayment.id, amount }];
    const isCashRefund = (r: { id: string }) =>
      getMethodType(store, payments.find((p) => p.id === r.id)?.providerId) === "cash";
    const cashIn = (list: { id: string; amount: number }[]) =>
      list.filter(isCashRefund).reduce((sum, r) => sum + r.amount, 0);
    const cashRefunded = cashIn(refunds);

    if (cashRefunded > 0 && isCashBlocked) {
      handleErrorToast(t("checkout.register_closed"));
      submissionRef.current = false;
      setIsProcessing(false);
      return;
    }

    const done: typeof refunds = [];
    try {
      const sdk = getSdk();
      // Sequential: if one fails, what already went through is still on record.
      for (const refund of refunds) {
        await sdk.admin.payment.refund(refund.id, {
          amount: refund.amount,
          ...(refundReasonId ? { refund_reason_id: refundReasonId } : {}),
          ...(note?.trim() ? { note: note.trim() } : {}),
        });
        done.push(refund);
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(order.id),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      await recordCash(
        order,
        "drop",
        cashRefunded,
        t("orders.post_sale.movement_refund", { id: order.display_id })
      );

      const methods = [
        ...new Set(
          refunds.map((r) =>
            getPaymentMethodLabel(store, payments.find((p) => p.id === r.id)?.providerId)
          )
        ),
      ].filter(Boolean);
      onRefunded?.(amount, methods.join(", "));

      toast.success(
        t("orders.refund_success", { amount: formatPrice(amount, currency) })
      );
      if (cashRefunded > 0) openDrawer();
      onClose();
    } catch (error) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(order.id),
      });
      // A split refund can fail after its first part: that money has left, so it is
      // recorded and the cashier is told, rather than reported as nothing happened.
      const partial = done.reduce((sum, r) => sum + r.amount, 0);
      if (partial > 0) {
        await recordCash(
          order,
          "drop",
          cashIn(done),
          t("orders.post_sale.movement_refund", { id: order.display_id })
        );
        if (cashIn(done) > 0) openDrawer();
        handleErrorToast(
          t("orders.refund_partial", {
            amount: formatPrice(partial, currency),
            error: getApiErrorMessage(error, t("orders.refund_failed")),
          })
        );
        onClose();
      } else {
        handleErrorToast(getApiErrorMessage(error, t("orders.refund_failed")));
        setStep("form");
      }
    } finally {
      submissionRef.current = false;
      setIsProcessing(false);
    }
  }, [
    selectedPayment,
    allocation,
    payments,
    store,
    isCashBlocked,
    recordCash,
    order,
    form,
    queryClient,
    currency,
    openDrawer,
    onClose,
    onRefunded,
    t,
  ]);

  return {
    isLocked,
    form,
    step,
    setStep,
    payments,
    selectedPayment,
    selectedPaymentId: selectedPayment?.id ?? "",
    handleSelectPayment,
    refundable,
    currency,
    amountText,
    setAmount,
    handleRefundFull,
    refundReasons,
    isProcessing,
    handleValidate,
    handleConfirm,
  };
};
