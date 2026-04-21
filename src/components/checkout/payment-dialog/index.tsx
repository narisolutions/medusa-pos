import React, { useMemo } from "react";
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
import { CreditCard, AlertTriangle } from "lucide-react";

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
    discount,
    change,
    canProcessPayment,
    quickAmounts,
    showConfirmation,
    handleCashValueChange,
    handleClose,
    handleQuickAmount,
    handleExactAmount,
    handleCompleteClick,
    handleConfirmPayment,
    setShowConfirmation,
    items,
    paymentMethodInfo,
    isCashPayment,
    draftOrder,
    billCounts,
  } = usePaymentModal(draftOrderId, onClose, isOpen);

  const { currency, promoCodes } = useCheckout();

  const inactiveCodes = useMemo(() => {
    if (!draftOrder?.items || promoCodes.length === 0) return new Set<string>();
    const activeCodes = new Set<string>(
      (draftOrder.items ?? [])
        .flatMap((item) => item.adjustments ?? [])
        .map((adj) => (adj as unknown as Record<string, unknown>).code as string | undefined)
        .filter((c): c is string => Boolean(c))
    );
    return new Set(promoCodes.filter((c) => !activeCodes.has(c)));
  }, [draftOrder, promoCodes]);

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
              Payment
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
                Order Summary · {items.length} {items.length === 1 ? "item" : "items"}
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const itemTitle = item.metadata?.product_title as string | undefined || item.title || "-";
                  const unitPrice = item.unit_price || 0;
                  const quantity = item.quantity || 0;
                  const lineTotal = unitPrice * quantity;

                  // Enrich with server-side data once the draft order loads.
                  // Use item.discount_total (gross/VAT-inclusive) so per-item
                  // amounts are consistent with the order-level discount_total.
                  const draftItem = draftOrder?.items?.find(
                    (di) => di.variant_id === item.variant_id
                  );
                  const adjustmentTotal =
                    (draftItem as unknown as Record<string, unknown>)?.discount_total as number | undefined
                    ?? draftItem?.adjustments?.reduce((sum, adj) => sum + (adj.amount ?? 0), 0)
                    ?? 0;
                  const discountedTotal = lineTotal - adjustmentTotal;
                  const adjCodes = [
                    ...new Set(
                      (draftItem?.adjustments ?? [])
                        .map((a) => (a as unknown as Record<string, unknown>).code as string | undefined)
                        .filter(Boolean)
                    ),
                  ] as string[];

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
                        <span className={adjustmentTotal > 0 ? "line-through text-fg-subtle" : "font-semibold"}>
                          {formatPrice(lineTotal, currency)}
                        </span>
                      </div>
                      {adjustmentTotal > 0 && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                            {adjCodes.length > 0 ? adjCodes.join(", ") : promoCodes.join(", ")}
                            {" "}-{formatPrice(adjustmentTotal, currency)}
                          </span>
                          <span className="text-xs font-semibold text-fg">
                            {formatPrice(discountedTotal, currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {discount > 0 && (
                <div className="mt-3 pt-3 border-t border-theme-border space-y-1">
                  {promoCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {promoCodes.map((c) => {
                        const inactive = inactiveCodes.has(c);
                        return (
                          <span
                            key={c}
                            className={`inline-flex items-center gap-1 text-xs font-mono font-semibold tracking-widest rounded px-2 py-0.5 border ${
                              inactive
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700"
                                : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                            }`}
                            title={inactive ? "Code accepted but no discount applied" : undefined}
                          >
                            {inactive && <AlertTriangle className="w-3 h-3 shrink-0" />}
                            {c}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-{formatPrice(discount, currency)}</span>
                  </div>
                </div>
              )}
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
                        Total Due
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
                              Including VAT {formatPrice(tax, currency)}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
                        Cash Tendered
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
                        Quick Amounts
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
                              Exact Amount
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
                        Numpad
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
                            {change >= 0 ? "Change Due" : "Amount Short"}
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
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCompleteClick}
                        disabled={!canProcessPayment || isProcessing}
                        className="h-16 text-xl font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white"
                      >
                        {isProcessing ? "Processing..." : "Complete Payment"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* CARD PAYMENT  */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-lg w-full text-center space-y-8">
                  <div>
                    <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-3">
                      Amount
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
                              Including VAT {formatPrice(tax, currency)}
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
                    Please present card to the payment terminal
                  </p>

                  <div className="flex gap-4 pt-8">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isProcessing}
                      className="flex-1 h-16 text-lg font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCompleteClick}
                      disabled={!canProcessPayment || isProcessing}
                      className="flex-2 h-16 text-xl font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white"
                    >
                      {isProcessing ? "Processing..." : "Confirm Payment"}
                    </Button>
                  </div>
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
    </Dialog>
  );
};

export default PaymentModal;
