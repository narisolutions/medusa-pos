import React from "react";
import { AdminOrder } from "@medusajs/types";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Numpad } from "@/components/ui/numpad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { formatPrice } from "@/utils/helpers";
import { getPaymentMethodLabel } from "@/utils/pos/payment";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useTranslation } from "@/i18n";
import { useRefund } from "./hooks";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder;
  /** Prefills and locks the amount — what a return or exchange left owing. */
  amount?: number;
  /** After the refund went through, with what was refunded and to which method(s). */
  onRefunded?: (amount: number, method: string) => void;
}

const RefundDialog: React.FC<Props> = ({ isOpen, onClose, order, amount: lockedAmount, onRefunded }) => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const {
    isLocked,
    form,
    step,
    setStep,
    payments,
    refundMethodLabel,
    splitParts,
    selectedPaymentId,
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
  } = useRefund(order, isOpen, onClose, lockedAmount, onRefunded);

  const amount = Number(amountText) || 0;
  const methodLabel = refundMethodLabel;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isProcessing && onClose()}
    >
      <DialogContent
        className="max-w-lg"
        preventOutsideClose={isProcessing}
        showCloseButton={!isProcessing}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-fg">
            {step === "confirm"
              ? t("orders.refund_confirm_title")
              : t("orders.refund_dialog_title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {step === "confirm"
              ? t("orders.refund_irreversible_warning")
              : isLocked
                ? t("orders.post_sale.refund_locked_description")
                : t("orders.refund_dialog_description")}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <p className="text-base text-fg">
                {t("orders.refund_confirm_body", {
                  amount: formatPrice(amount, currency),
                  method: methodLabel || t("orders.payment_label"),
                })}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirm}
                className="h-16 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                {isProcessing && (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                )}
                {isProcessing
                  ? t("orders.refund_processing")
                  : t("orders.refund_confirm_submit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() => setStep("form")}
                className="h-16 text-lg font-medium"
              >
                {t("common.back")}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={handleValidate} className="space-y-5">
              {!isLocked && (
                <div className="bg-surface-muted border border-theme-border rounded-lg p-4 text-center">
                  <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-1">
                    {t("orders.refund_refundable_label")}
                  </div>
                  <div className="text-3xl font-bold text-fg">
                    {formatPrice(refundable, currency)}
                  </div>
                </div>
              )}

              {payments.length > 1 && (
                <div>
                  <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
                    {t("orders.refund_payment_select_label")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {payments.map((payment) => (
                      <Button
                        key={payment.id}
                        type="button"
                        onClick={() => handleSelectPayment(payment.id)}
                        disabled={isProcessing}
                        aria-pressed={selectedPaymentId === payment.id}
                        className={`h-16 flex-col gap-0.5 text-base font-semibold ${
                          selectedPaymentId === payment.id
                            ? "bg-primary text-white shadow"
                            : "bg-surface border border-theme-border hover:bg-surface-hover text-fg"
                        }`}
                      >
                        <span>{formatPrice(payment.refundable, currency)}</span>
                        <span className="text-base font-normal opacity-80">
                          {getPaymentMethodLabel(store, payment.providerId) || t("orders.payment_label")}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="amount"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base font-medium">
                        {isLocked
                          ? t("orders.post_sale.refund_owed_label")
                          : t("orders.refund_amount_label")}
                      </FormLabel>
                      {!isLocked && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isProcessing}
                          onClick={handleRefundFull}
                        >
                          {t("orders.refund_full_button")}
                        </Button>
                      )}
                    </div>
                    <FormControl>
                      <div className="bg-surface-muted border border-theme-border rounded-lg px-4 py-3 text-right text-3xl font-bold text-fg">
                        {formatPrice(amount, currency)}
                      </div>
                    </FormControl>
                    {splitParts.length > 1 && (
                      <p className="mt-2 text-base text-fg-muted text-right">
                        {splitParts
                          .map((part) => `${part.label} ${formatPrice(part.amount, currency)}`)
                          .join(" + ")}
                      </p>
                    )}
                    {!isLocked && (
                      <Numpad
                        value={amountText}
                        onChange={setAmount}
                        hideActions
                        className="mt-3"
                      />
                    )}
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {refundReasons.length > 0 && (
                <FormField
                  control={form.control}
                  name="refundReasonId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        {t("orders.refund_reason_label")}
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          {/* SelectValue renders the raw value, so show the label. */}
                          <span className="truncate">
                            {refundReasons.find((r) => r.id === field.value)
                              ?.label ?? t("orders.refund_reason_none")}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">
                            {t("orders.refund_reason_none")}
                          </SelectItem>
                          {refundReasons.map((reason) => (
                            <SelectItem key={reason.id} value={reason.id}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      {t("orders.refund_note_label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder={t("orders.refund_note_placeholder")}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1 h-14 text-lg font-medium"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || refundable <= 0}
                  className="flex-1 h-14 text-lg font-medium bg-red-600 hover:bg-red-700 text-white"
                >
                  {t("orders.refund_continue_button")}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;
