import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/helpers";
import constants from "@/utils/constants";
import { useTranslation } from "@/i18n";
import { useRecordPayment } from "./hooks";
import { toNumber } from "@/utils/pos/pricing";
import PaymentMethodPicker from "../payment-method-picker";
import CashTender from "../cash-tender";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder;
}

const RecordPaymentDialog: React.FC<Props> = ({ isOpen, onClose, order }) => {
  const { t } = useTranslation();
  const {
    methods,
    selectedMethod,
    setSelectedMethod,
    total,
    currency,
    isProcessing,
    handleConfirm,
    isCashSelected,
    cashDue,
    tender,
  } = useRecordPayment(order, onClose);
  const due = isCashSelected ? cashDue : total;

  const displayCurrency = currency || constants.CHECKOUT_CONFIG.CURRENCY;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent
        className={isCashSelected ? "max-w-3xl max-h-[94vh] overflow-y-auto" : "max-w-md"}
        preventOutsideClose={isProcessing}
        showCloseButton={!isProcessing}
      >
        <DialogTitle className="text-2xl font-semibold text-fg text-center">
          {t("orders.record_payment")}
        </DialogTitle>

        <div className={isCashSelected ? "space-y-4 py-2" : "space-y-6 py-4"}>
          <div className="bg-surface-muted border border-theme-border rounded-lg px-5 py-3 flex items-center justify-between gap-4">
            <div className="text-base font-semibold text-fg-muted">
              {t("checkout.amount_due_label")}
              {due !== toNumber(total) && (
                <div className="font-normal">
                  {t("checkout.rounded_from")} {formatPrice(total, displayCurrency)}
                </div>
              )}
            </div>
            <div className="text-total tabular-nums text-fg">
              {formatPrice(due, displayCurrency)}
            </div>
          </div>

          <PaymentMethodPicker
            methods={methods}
            selected={selectedMethod ?? ""}
            onSelect={setSelectedMethod}
            disabled={isProcessing}
          />

          {isCashSelected && (
            <CashTender
              tender={tender}
              currency={displayCurrency}
              disabled={isProcessing}
              onEnter={tender.canProcessPayment && !isProcessing ? () => void handleConfirm() : undefined}
            />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            size="lg"
            className="flex-1 text-lg"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedMethod || (isCashSelected && !tender.canProcessPayment)}
            loading={isProcessing}
            variant="success"
            size="lg"
            className="flex-2 text-lg"
          >
            {isProcessing ? t("common.processing") : t("orders.record_payment")}
            {!isProcessing && <span className="tabular-nums">· {formatPrice(due, displayCurrency)}</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
