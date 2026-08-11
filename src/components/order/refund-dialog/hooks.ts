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
  cashDrawerIssueStaffHintToast,
} from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQueryRefundReasons } from "@/hooks/queries/useQueryRefundReasons";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { useRegister } from "@/context/register";
import { verifyManagerPin } from "@/utils/settings/preferences/pin";
import {
  getRefundablePayments,
  getOrderPaymentMethodType,
} from "@/utils/pos/payment";

export const useRefund = (order: AdminOrder, isOpen: boolean, onClose: () => void) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: store } = useQueryStore();
  const { data: refundReasons = [] } = useQueryRefundReasons(isOpen);
  const { openCashDrawer, getDefaultPrinter } = usePrinterService();
  const { requirePinToClose, managerPinHash } = useRegister();

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
  const refundable = selectedPayment?.refundable ?? 0;
  const currency = getOrderCurrency(order);
  const pinRequired = requirePinToClose && !!managerPinHash;

  const form = useForm<Forms["Refund"]>({
    resolver: coercedZodResolver(schemas.refund),
    defaultValues: {
      amount: refundable,
      refundReasonId: "",
      note: "",
      managerPin: "",
    },
  });

  const [amountText, setAmountText] = useState(() =>
    refundable > 0 ? String(refundable) : ""
  );

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
      setAmountText(first ? String(first.refundable) : "");
      form.reset({
        amount: first?.refundable ?? 0,
        refundReasonId: "",
        note: "",
        managerPin: "",
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

  // Config-dependent rules (refundable ceiling, manager PIN) live here rather
  // than in the schema, matching the close-register flow.
  const handleValidate = form.handleSubmit(async (data) => {
    if (!selectedPayment) return;

    if (data.amount > refundable) {
      form.setError("amount", {
        message: translate("orders.refund_exceeds_refundable"),
      });
      return;
    }

    if (pinRequired) {
      const ok = data.managerPin
        ? await verifyManagerPin(data.managerPin, managerPinHash as string)
        : false;
      if (!ok) {
        form.setError("managerPin", {
          message: translate("orders.refund_pin_invalid"),
        });
        return;
      }
    }

    setStep("confirm");
  });

  // Cash paid back out of the drawer — mirrors the post-order hardware step.
  const openDrawerForCashRefund = useCallback(() => {
    if (getOrderPaymentMethodType(order, store) !== "cash") return;

    const printer = getDefaultPrinter();
    if (!printer?.openCashDrawer || !printer.openCashDrawerOnCash) return;

    openCashDrawer(printer).catch((drawerError) => {
      void logger.warn(`Refund cash drawer failed: ${safeStringify(drawerError)}`);
      toast.error(t("checkout.cash_drawer_error_title"), {
        description: cashDrawerIssueStaffHintToast(printer.name),
      });
    });
  }, [order, store, getDefaultPrinter, openCashDrawer, t]);

  const handleConfirm = useCallback(async () => {
    if (submissionRef.current || !selectedPayment) return;
    submissionRef.current = true;
    setIsProcessing(true);

    const { amount, refundReasonId, note } = form.getValues();

    try {
      const sdk = getSdk();
      await sdk.admin.payment.refund(selectedPayment.id, {
        amount,
        ...(refundReasonId ? { refund_reason_id: refundReasonId } : {}),
        ...(note?.trim() ? { note: note.trim() } : {}),
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(order.id),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      toast.success(
        t("orders.refund_success", { amount: formatPrice(amount, currency) })
      );
      openDrawerForCashRefund();
      onClose();
    } catch (error) {
      handleErrorToast(getApiErrorMessage(error, t("orders.refund_failed")));
      setStep("form");
    } finally {
      submissionRef.current = false;
      setIsProcessing(false);
    }
  }, [
    selectedPayment,
    form,
    queryClient,
    order.id,
    currency,
    openDrawerForCashRefund,
    onClose,
    t,
  ]);

  return {
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
    pinRequired,
    isProcessing,
    handleValidate,
    handleConfirm,
  };
};
