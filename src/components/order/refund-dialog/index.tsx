import React from "react";
import { AdminOrder } from "@medusajs/types";
import { AlertTriangle } from "lucide-react";
import { Tile } from "@/components/ui/tile";
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
        className={`${isLocked || step === "confirm" ? "max-w-lg" : "max-w-4xl"} max-h-[94vh] overflow-y-auto`}
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
            <div className="flex items-start gap-3 rounded-lg border border-danger bg-danger-subtle p-4">
              <AlertTriangle className="size-5 shrink-0 text-danger-text mt-0.5" />
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
                variant="destructive"
                size="xl"
                loading={isProcessing}
                onClick={handleConfirm}
              >
                {isProcessing
                  ? t("orders.refund_processing")
                  : t("orders.refund_confirm_submit")}
                {!isProcessing && <span className="tabular-nums">· {formatPrice(amount, currency)}</span>}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() => setStep("form")}
                size="xl"
              >
                {t("common.back")}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            {/* Two columns so the whole refund fits one screen: details left, keypad right. */}
            <form onSubmit={handleValidate} className={isLocked ? "space-y-5" : "grid grid-cols-2 gap-6"}>
              <div className="space-y-4">
                {!isLocked && (
                  <div className="flex items-baseline justify-between rounded-lg border border-theme-border bg-surface-muted px-4 py-3">
                    <span className="text-base font-semibold text-fg-muted">
                      {t("orders.refund_refundable_label")}
                    </span>
                    <span className="text-amount tabular-nums text-fg">
                      {formatPrice(refundable, currency)}
                    </span>
                  </div>
                )}

                {payments.length > 1 && (
                  <div>
                    <div className="text-base font-semibold text-fg-muted mb-2">
                      {t("orders.refund_payment_select_label")}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {payments.map((payment) => (
                        <Tile
                          key={payment.id}
                          label={<span className="tabular-nums">{formatPrice(payment.refundable, currency)}</span>}
                          subline={getPaymentMethodLabel(store, payment.providerId) || t("orders.payment_label")}
                          selected={selectedPaymentId === payment.id}
                          onClick={() => handleSelectPayment(payment.id)}
                          disabled={isProcessing}
                        />
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
                            disabled={isProcessing}
                            onClick={handleRefundFull}
                          >
                            {t("orders.refund_full_button")}
                          </Button>
                        )}
                      </div>
                      <FormControl>
                        <div className="bg-surface-muted border border-theme-border rounded-lg px-4 py-3 text-right text-3xl font-bold tabular-nums text-fg">
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
                      <FormMessage className="text-base" />
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
                        <FormMessage className="text-base" />
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
                      <FormMessage className="text-base" />
                    </FormItem>
                  )}
                />
              </div>

              {!isLocked && (
                <Numpad
                  value={amountText}
                  onChange={setAmount}
                  hideActions
                  maxDecimals={2}
                  className="self-center"
                />
              )}

              <div className="col-span-2 flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                  size="lg"
                  className="flex-1 text-lg"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || refundable <= 0}
                  variant="destructive"
                  size="lg"
                  className="flex-2 text-lg"
                >
                  {t("orders.refund_continue_button")}
                  {amount > 0 && <span className="tabular-nums">· {formatPrice(amount, currency)}</span>}
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
