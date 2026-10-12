import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Numpad } from "@/components/ui/numpad";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/utils/helpers";
import { getCurrencySymbol } from "@/utils/settings/preferences";
import constants from "@/utils/constants";
import { useCheckout } from "../hooks";
import { usePaymentModal } from "./hooks";
import ConfirmationDialog from "./confirmation-dialog";
import PayLaterConfirmationDialog from "./pay-later-confirmation-dialog";
import { AlertTriangle, CheckCircle2, Clock, CreditCard, Landmark, Printer } from "lucide-react";
import { toast } from "sonner";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { useTranslation } from "@/i18n";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftOrderId?: string | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  draftOrderId,
}) => {
  const {
    customerPaid,
    isProcessing,
    tax,
    total,
    cashDue,
    cashRoundingActive,
    change,
    canProcessPayment,
    quickAmounts,
    showConfirmation,
    showPayLaterConfirmation,
    handleCashValueChange,
    handleClose,
    handleQuickAmount,
    handleExactAmount,
    handleCompleteClick,
    handleConfirmPayment,
    setShowConfirmation,
    handleDeliverPayLaterClick,
    handleConfirmPayLater,
    setShowPayLaterConfirmation,
    items,
    paymentMethodInfo,
    isCashPayment,
    isBankTransfer,
    hasBankDetails,
    draftOrder,
    billCounts,
    completed,
  } = usePaymentModal(draftOrderId, onClose, isOpen);

  const { currency } = useCheckout();
  const { t } = useTranslation();

  const isLoading = !draftOrder;
  const { printOrderReceipt } = usePrinterService();
  const [isReprinting, setIsReprinting] = useState(false);

  // Scanning the next customer's first item starts the new sale.
  useEffect(() => {
    if (completed && items.length > 0) handleClose();
  }, [completed, items.length, handleClose]);

  const reprint = async () => {
    if (!completed) return;
    setIsReprinting(true);
    try {
      await printOrderReceipt(completed.order);
      toast.success(t("orders.receipt_sent_to_printer"));
    } catch {
      toast.error(t("orders.receipt_did_not_print"));
    } finally {
      setIsReprinting(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && !isProcessing) {
      handleClose();
    }
  };

  const PaymentIcon = paymentMethodInfo.icon;
  const PanelIcon = isBankTransfer ? Landmark : CreditCard;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent
        className="max-w-6xl h-[92vh] p-0 flex flex-col overflow-hidden gap-0"
        preventOutsideClose={true}
      >
        {/* Simple Header */}
        <div className="bg-surface border-b border-theme-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-xl font-bold text-fg">
              {t("checkout.payment_dialog_title")}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <PaymentIcon className="size-5 text-fg-subtle" />
              <span className="text-base text-fg-muted">
                {paymentMethodInfo.label}
              </span>
            </div>
          </div>
        </div>

        {completed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-8 text-center">
            {completed.outstanding ? (
              <Clock className="size-24 text-warning-text" aria-hidden />
            ) : (
              <CheckCircle2 className="size-24 text-success-text" aria-hidden />
            )}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-fg">
                {completed.outstanding ? t("checkout.sale_outstanding") : t("checkout.sale_complete")}
              </h2>
              <p className="text-xl text-fg-muted">
                {t("orders.order_title", { id: completed.order.display_id })}
              </p>
            </div>
            {completed.change > 0 && (
              <div role="status" className="rounded-xl border-2 border-success bg-success-subtle px-12 py-6">
                <div className="text-lg font-semibold text-success-text">{t("checkout.change_due")}</div>
                <div className="text-7xl font-bold tabular-nums text-fg">
                  {formatPrice(completed.change, currency)}
                </div>
              </div>
            )}
            <div className="flex w-full max-w-2xl gap-4 pt-4">
              <Button variant="outline" size="xl" className="flex-1" loading={isReprinting} onClick={() => void reprint()}>
                {!isReprinting && <Printer />}
                {t("orders.print_receipt_button")}
              </Button>
              <Button variant="success" size="xl" className="flex-2" autoFocus onClick={handleClose}>
                {t("checkout.new_sale")}
              </Button>
            </div>
            <p className="text-base text-fg-muted">{t("checkout.new_sale_hint")}</p>
          </div>
        ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Items Summary */}
          <div className="w-80 bg-surface-muted border-r border-theme-border overflow-y-auto">
            <div className="p-4">
              <div className="text-base font-semibold text-fg-muted mb-3">
                {t("checkout.order_summary_label")}
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const itemTitle = item.title || "-";
                  const unitPrice = item.unit_price || 0;
                  const quantity = item.quantity || 0;
                  const lineTotal = unitPrice * quantity;

                  return (
                    <div
                      key={item.variant_id}
                      className="bg-surface rounded-md p-3 text-base"
                    >
                      <div className="font-medium text-fg mb-1">
                        {itemTitle}
                      </div>
                      <div className="flex justify-between text-fg-muted tabular-nums">
                        <span>
                          {quantity} × {formatPrice(unitPrice, currency)}
                        </span>
                        <span className="font-semibold">
                          {formatPrice(lineTotal, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Payment Interface */}
          <div className="flex-1 flex flex-col">
            {isCashPayment ? (
              <div className="flex-1 min-h-0 p-8 pb-6">
                <div className="h-full flex flex-col min-h-0">
                  {/* Scrolls on short screens; the actions below stay pinned and visible. */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                  {/* Top: Total & Cash Tendered */}
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div className="flex flex-col">
                      <div className="text-base font-semibold text-fg-muted mb-2">
                        {t("checkout.total_due_label")}
                      </div>
                      {isLoading ? (
                        <>
                          <Skeleton className="h-[60px] w-full mb-1 bg-surface-subtle" />
                          <Skeleton className="h-5 w-48 bg-surface-subtle" />
                        </>
                      ) : (
                        <>
                          <div className="text-6xl font-bold tabular-nums text-fg">
                            {formatPrice(cashDue, currency)}
                          </div>
                          {cashRoundingActive && (
                            <div className="text-base text-fg-muted mt-2">
                              {t("checkout.rounded_from")}{" "}
                              {formatPrice(total, currency)}
                            </div>
                          )}
                          {tax > 0 && (
                            <div className="text-base text-fg-muted mt-2">
                              {t("checkout.including_vat")}{formatPrice(tax, currency)}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="text-base font-semibold text-fg-muted mb-2">
                        {t("checkout.cash_tendered_label")}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={customerPaid}
                          onChange={(e) =>
                            handleCashValueChange(e.target.value)
                          }
                          placeholder="0.00"
                          className="text-5xl h-24 text-right font-bold border-2 pr-16 rounded-lg"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-4xl text-fg-subtle">
                          {getCurrencySymbol(currency || constants.CHECKOUT_CONFIG.CURRENCY)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Amounts & Numpad*/}
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div className="flex flex-col">
                      <div className="text-base font-semibold text-fg-muted mb-2">
                        {t("checkout.quick_amounts_label")}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {quickAmounts.map((amount) => {
                          const count = billCounts[amount] || 0;
                          return (
                            <div key={amount} className="relative">
                              <button
                                onClick={() => handleQuickAmount(amount, false)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  handleQuickAmount(amount, true);
                                }}
                                className="relative w-full h-16 bg-surface border-2 border-theme-border-strong rounded-lg hover:border-fg-subtle hover:bg-surface-hover active:bg-accent transition-all flex items-center justify-center cursor-pointer active:scale-[0.98] touch-manipulation"
                              >
                                <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-fg-subtle"></div>
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-fg-subtle"></div>
                                <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-fg-subtle"></div>
                                <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-fg-subtle"></div>
                                
                                <span className="text-xl font-semibold text-fg">
                                  {amount}
                                </span>
                                
                                {count > 0 && (
                                  <div className="absolute -top-2 -right-2 bg-danger text-danger-foreground rounded-full min-w-7 h-7 px-1 flex items-center justify-center text-base font-semibold border-2 border-surface">
                                    {count}
                                  </div>
                                )}
                              </button>
                            </div>
                          );
                        })}
                        {/* Exact Amount Button */}
                        <div className="relative col-span-2">
                          <button
                            onClick={handleExactAmount}
                            className="relative w-full h-16 bg-info-subtle border-2 border-info rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-[0.98] active:opacity-80 touch-manipulation"
                          >
                            <span className="text-lg font-semibold text-info-text">
                              {t("checkout.exact_amount_button")}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="text-base font-semibold text-fg-muted mb-2">
                        {t("checkout.numpad_label")}
                      </div>
                      <div className="flex items-center justify-center">
                        <Numpad
                          value={customerPaid}
                          onChange={handleCashValueChange}
                          onEnter={
                            !isLoading && canProcessPayment
                              ? handleCompleteClick
                              : undefined
                          }
                          allowDecimal={true}
                          maxDecimals={2}
                          hideActions={true}
                        />
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Bottom: Actions — pinned, never clipped */}
                  <div className="mt-auto space-y-3 pt-3 shrink-0">
                    <div className="h-20 flex items-center">
                      {customerPaid && parseFloat(customerPaid) > 0 && (
                        <div
                          role="status"
                          className={`w-full px-5 py-3 rounded-lg border-2 flex items-center justify-between ${
                            change >= 0 ? "bg-success-subtle border-success" : "bg-warning-subtle border-warning"
                          }`}
                        >
                          <span
                            className={`flex items-center gap-2 text-lg font-bold ${
                              change >= 0 ? "text-success-text" : "text-warning-text"
                            }`}
                          >
                            {change >= 0 ? <CheckCircle2 className="size-6" /> : <AlertTriangle className="size-6" />}
                            {change >= 0 ? t("checkout.change_due") : t("checkout.amount_short")}
                          </span>
                          <span className="text-total tabular-nums text-fg">
                            {formatPrice(Math.abs(change), currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" size="xl" onClick={handleClose} disabled={isProcessing}>
                        {t("common.cancel")}
                      </Button>
                      <Button
                        size="xl"
                        onClick={handleCompleteClick}
                        disabled={isLoading || !canProcessPayment}
                        loading={isProcessing}
                        className="text-xl font-bold disabled:opacity-40"
                      >
                        {isProcessing ? t("common.processing") : t("checkout.complete_payment_button")}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleDeliverPayLaterClick}
                      disabled={isLoading || isProcessing}
                      className="w-full h-14 text-base font-medium border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover"
                    >
                      {t("checkout.deliver_pay_later")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* CARD OR BANK TRANSFER PAYMENT */
              <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-8">
                <div className="max-w-lg w-full text-center space-y-8">
                  <div>
                    <div className="text-base font-semibold text-fg-muted mb-3">
                      {t("checkout.amount_label")}
                    </div>
                    {isLoading ? (
                      <>
                        <Skeleton className="h-[96px] w-full mb-2 mx-auto bg-surface-subtle" />
                        <Skeleton className="h-5 w-48 mx-auto bg-surface-subtle" />
                      </>
                    ) : (
                      <>
                        <div className="text-8xl font-bold tabular-nums text-fg">
                          {formatPrice(total, currency)}
                        </div>
                        {tax > 0 && (
                            <div className="text-base text-fg-muted mt-2">
                              {t("checkout.including_vat")}{formatPrice(tax, currency)}
                            </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex justify-center py-6">
                    <div className="size-32 rounded-2xl bg-surface-subtle flex items-center justify-center">
                      <PanelIcon className="size-16 text-fg-subtle" />
                    </div>
                  </div>

                  <p className="text-xl text-fg">
                    {isBankTransfer ? t("checkout.bank_transfer_message") : t("checkout.present_card_message")}
                  </p>

                  <div className="flex gap-4 pt-8">
                    <Button variant="outline" size="xl" onClick={handleClose} disabled={isProcessing} className="flex-1">
                      {t("common.cancel")}
                    </Button>
                    <Button
                      size="xl"
                      onClick={handleCompleteClick}
                      disabled={isLoading || !canProcessPayment}
                      loading={isProcessing}
                      className="flex-2 text-xl font-bold disabled:opacity-40"
                    >
                      {isProcessing
                        ? t("common.processing")
                        : isBankTransfer
                          ? t("checkout.transfer_received_button")
                          : t("checkout.confirm_payment_button")}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDeliverPayLaterClick}
                    disabled={isLoading || isProcessing}
                    className={
                      isBankTransfer
                        ? "w-full h-16 text-lg font-semibold"
                        : "w-full h-14 text-base font-medium border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover"
                    }
                  >
                    {isBankTransfer ? t("checkout.awaiting_transfer_button") : t("checkout.deliver_pay_later")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </DialogContent>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onCancel={() => setShowConfirmation(false)}
        onConfirm={handleConfirmPayment}
        isProcessing={isProcessing}
        total={total}
        message={isBankTransfer ? t("checkout.confirm_transfer_message") : undefined}
        confirmLabel={isBankTransfer ? t("checkout.transfer_received_button") : undefined}
      />

      {/* Pay-later Confirmation Dialog */}
      <PayLaterConfirmationDialog
        isOpen={showPayLaterConfirmation}
        onCancel={() => setShowPayLaterConfirmation(false)}
        onConfirm={handleConfirmPayLater}
        isProcessing={isProcessing}
        total={total}
        message={isBankTransfer && hasBankDetails ? t("checkout.awaiting_transfer_confirm_message") : undefined}
      />
    </Dialog>
  );
};

export default PaymentModal;
