import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/helpers";
import constants from "@/utils/constants";
import { useTranslation } from "@/i18n";
import { useRecordPayment } from "./hooks";
import PaymentMethodPicker from "../payment-method-picker";

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
  } = useRecordPayment(order, onClose);

  const displayCurrency = currency || constants.CHECKOUT_CONFIG.CURRENCY;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent
        className="max-w-md"
        preventOutsideClose={isProcessing}
        showCloseButton={!isProcessing}
      >
        <DialogTitle className="text-2xl font-semibold text-fg text-center">
          {t("orders.record_payment")}
        </DialogTitle>

        <div className="space-y-6 py-4">
          <div className="bg-surface-muted border border-theme-border rounded-lg p-4 text-center">
            <div className="text-base font-semibold text-fg-muted mb-1">
              {t("checkout.amount_due_label")}
            </div>
            <div className="text-total tabular-nums text-fg">
              {formatPrice(total, displayCurrency)}
            </div>
          </div>

          <PaymentMethodPicker
            methods={methods}
            selected={selectedMethod ?? ""}
            onSelect={setSelectedMethod}
            disabled={isProcessing}
          />
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
            disabled={!selectedMethod}
            loading={isProcessing}
            variant="success"
            size="lg"
            className="flex-2 text-lg"
          >
            {isProcessing ? t("common.processing") : t("orders.record_payment")}
            {!isProcessing && <span className="tabular-nums">· {formatPrice(total, displayCurrency)}</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
