import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Numpad } from "@/components/ui/numpad";
import { useTranslation } from "@/i18n";
import { formatPrice } from "@/utils/helpers";
import constants from "@/utils/constants";
import { getCurrencySymbol } from "@/utils/settings/preferences";
import type { CashTender as CashTenderState } from "@/hooks/order/useCashTender";

interface Props {
  tender: CashTenderState;
  currency: string;
  disabled?: boolean;
  /** The numpad's Enter, when the amount covers what is due. */
  onEnter?: () => void;
}

/** Cash handed over: the amount, notes to count it in, the numpad and the change, as at checkout. */
const CashTender: React.FC<Props> = ({ tender, currency, disabled, onEnter }) => {
  const { t } = useTranslation();
  const { customerPaid, change, billCounts, quickAmounts } = tender;
  const tendered = parseFloat(customerPaid) || 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-base font-semibold text-fg-muted mb-2">{t("checkout.cash_tendered_label")}</div>
        <div className="relative">
          <Input
            type="number"
            value={customerPaid}
            onChange={(e) => tender.handleCashValueChange(e.target.value)}
            placeholder="0.00"
            className="text-4xl h-20 text-right font-bold border-2 pr-14 rounded-lg"
            step="0.01"
            min="0"
            inputMode="decimal"
            disabled={disabled}
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-3xl text-fg-subtle">
            {getCurrencySymbol(currency || constants.CHECKOUT_CONFIG.CURRENCY)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="grid grid-cols-2 content-start gap-3">
          {quickAmounts.map((amount) => {
            const count = billCounts[amount] || 0;
            return (
              <button
                key={amount}
                type="button"
                disabled={disabled}
                onClick={() => tender.handleQuickAmount(amount, false)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  tender.handleQuickAmount(amount, true);
                }}
                className="relative h-14 bg-surface border-2 border-theme-border-strong rounded-lg hover:border-fg-subtle text-xl font-semibold text-fg"
              >
                {amount}
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-danger text-danger-foreground rounded-full min-w-7 h-7 px-1 flex items-center justify-center text-base font-bold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={tender.handleExactAmount}
            className="col-span-2 h-14 bg-info-subtle border-2 border-info rounded-lg text-lg font-semibold text-info-text"
          >
            {t("checkout.exact_amount_button")}
          </button>
        </div>
        <div className="flex items-start justify-center">
          <Numpad
            value={customerPaid}
            onChange={tender.handleCashValueChange}
            onEnter={onEnter}
            allowDecimal={true}
            maxDecimals={2}
            hideActions={true}
          />
        </div>
      </div>

      <div className="h-16 flex items-center">
        {tendered > 0 && (
          <div
            role="status"
            className={`w-full px-5 py-3 rounded-lg border-2 flex items-center justify-between ${
              change >= 0 ? "bg-success-subtle border-success" : "bg-warning-subtle border-warning"
            }`}
          >
            <span className={`flex items-center gap-2 text-lg font-bold ${change >= 0 ? "text-success-text" : "text-warning-text"}`}>
              {change >= 0 ? <CheckCircle2 className="size-6" /> : <AlertTriangle className="size-6" />}
              {change >= 0 ? t("checkout.change_due") : t("checkout.amount_short")}
            </span>
            <span className="text-total tabular-nums text-fg">{formatPrice(Math.abs(change), currency)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashTender;
