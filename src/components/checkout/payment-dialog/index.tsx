import React from "react";
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
import { CreditCard } from "lucide-react";
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
    draftOrder,
    billCounts,
  } = usePaymentModal(draftOrderId, onClose, isOpen);

  const { currency } = useCheckout();
  const { t } = useTranslation();

  const isLoading = !draftOrder;

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  const PaymentIcon = paymentMethodInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent
        className="max-w-6xl h-[85vh] p-0 flex flex-col overflow-hidden gap-0"
        preventOutsideClose={true}
      >
        {/* Simple Header */}
        <div className="bg-surface border-b border-theme-border px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-xl font-bold text-fg">
              {t("checkout.payment_dialog_title")}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <PaymentIcon className="w-4 h-4 text-fg-subtle" />
              <span className="text-sm text-fg-muted">
                {paymentMethodInfo.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Items Summary */}
          <div className="w-80 bg-surface-muted border-r border-theme-border overflow-y-auto">
            <div className="p-4">
              <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-3">
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
                      className="bg-surface rounded p-3 text-sm"
                    >
                      <div className="font-medium text-fg mb-1">
                        {itemTitle}
                      </div>
                      <div className="flex justify-between text-xs text-fg-muted">
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
              <div className="flex-1 p-8">
                <div className="h-full flex flex-col">
                  {/* Top: Total & Cash Tendered */}
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
                        {t("checkout.total_due_label")}
                      </div>
                      {isLoading ? (
                        <>
                          <Skeleton className="h-[60px] w-full mb-1 bg-surface-subtle" />
                          <Skeleton className="h-5 w-48 bg-surface-subtle" />
                        </>
                      ) : (
                        <>
                          <div className="text-6xl font-bold text-fg">
                            {formatPrice(total, currency)}
                          </div>
                          {tax > 0 && (
                            <div className="text-sm text-fg-subtle mt-2">
                              {t("checkout.including_vat")}{formatPrice(tax, currency)}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
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
                      <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
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
                                className="relative w-full h-16 bg-surface border-2 border-theme-border-strong rounded-lg hover:border-fg-subtle hover:bg-surface-hover transition-all flex items-center justify-center cursor-pointer active:scale-[0.98] touch-manipulation"
                              >
                                <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-fg-subtle"></div>
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-fg-subtle"></div>
                                <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-fg-subtle"></div>
                                <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-fg-subtle"></div>
                                
                                <span className="text-xl font-semibold text-fg">
                                  {amount}
                                </span>
                                
                                {count > 0 && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold border border-white">
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
                            className="relative w-full h-16 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center justify-center cursor-pointer active:scale-[0.98] touch-manipulation"
                          >
                            <span className="text-base font-semibold text-blue-800 dark:text-blue-300">
                              {t("checkout.exact_amount_button")}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
                        {t("checkout.numpad_label")}
                      </div>
                      <div className="flex items-center justify-center">
                        <Numpad
                          value={customerPaid}
                          onChange={handleCashValueChange}
                          onEnter={
                            canProcessPayment
                              ? handleCompleteClick
                              : undefined
                          }
                          allowDecimal={true}
                          hideActions={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Actions */}
                  <div className="mt-auto space-y-4">
                    <div className="h-20 flex items-center">
                      {customerPaid && parseFloat(customerPaid) > 0 && (
                        <div
                          className={`w-full p-4 rounded-lg flex items-center justify-between ${
                            change >= 0
                              ? "bg-emerald-100 border-2 border-emerald-400"
                              : "bg-rose-100 border-2 border-rose-400"
                          }`}
                        >
                          <span
                            className={`text-sm font-bold uppercase tracking-wider ${
                              change >= 0
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }`}
                          >
                            {change >= 0 ? t("checkout.change_due") : t("checkout.amount_short")}
                          </span>
                          <span
                            className={`text-3xl font-bold ${
                              change >= 0
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }`}
                          >
                            {formatPrice(Math.abs(change), currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="h-16 text-lg font-semibold"
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        onClick={handleCompleteClick}
                        disabled={!canProcessPayment || isProcessing}
                        className="h-16 text-xl font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white"
                      >
                        {isProcessing ? t("common.processing") : t("checkout.complete_payment_button")}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleDeliverPayLaterClick}
                      disabled={isLoading || isProcessing}
                      className="w-full h-12 text-base font-medium border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover"
                    >
                      {t("checkout.deliver_pay_later")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* CARD PAYMENT  */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-lg w-full text-center space-y-8">
                  <div>
                    <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-3">
                      {t("checkout.amount_label")}
                    </div>
                    {isLoading ? (
                      <>
                        <Skeleton className="h-[96px] w-full mb-2 mx-auto bg-surface-subtle" />
                        <Skeleton className="h-5 w-48 mx-auto bg-surface-subtle" />
                      </>
                    ) : (
                      <>
                        <div className="text-8xl font-bold text-fg">
                          {formatPrice(total, currency)}
                        </div>
                        {tax > 0 && (
                            <div className="text-sm text-fg-subtle mt-2">
                              {t("checkout.including_vat")}{formatPrice(tax, currency)}
                            </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex justify-center py-6">
                    <div className="w-32 h-32 rounded-2xl bg-surface-subtle flex items-center justify-center">
                      <CreditCard className="w-16 h-16 text-fg-subtle" />
                    </div>
                  </div>

                  <p className="text-lg text-fg-muted">
                    {t("checkout.present_card_message")}
                  </p>

                  <div className="flex gap-4 pt-8">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isProcessing}
                      className="flex-1 h-16 text-lg font-semibold"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={handleCompleteClick}
                      disabled={!canProcessPayment || isProcessing}
                      className="flex-2 h-16 text-xl font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white"
                    >
                      {isProcessing ? t("common.processing") : t("checkout.confirm_payment_button")}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDeliverPayLaterClick}
                    disabled={isLoading || isProcessing}
                    className="w-full h-12 text-base font-medium border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover"
                  >
                    {t("checkout.deliver_pay_later")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onCancel={() => setShowConfirmation(false)}
        onConfirm={handleConfirmPayment}
        isProcessing={isProcessing}
        total={total}
      />

      {/* Pay-later Confirmation Dialog */}
      <PayLaterConfirmationDialog
        isOpen={showPayLaterConfirmation}
        onCancel={() => setShowPayLaterConfirmation(false)}
        onConfirm={handleConfirmPayLater}
        isProcessing={isProcessing}
        total={total}
      />
    </Dialog>
  );
};

export default PaymentModal;
