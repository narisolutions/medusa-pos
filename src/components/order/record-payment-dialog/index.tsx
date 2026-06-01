import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/helpers";
import constants from "@/utils/constants";
import { useTranslation } from "@/i18n";
import { useRecordPayment } from "./hooks";

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
      <DialogContent className="max-w-md">
        <DialogTitle className="text-2xl font-semibold text-fg text-center">
          {t("orders.record_payment")}
        </DialogTitle>

        <div className="space-y-6 py-4">
          <div className="bg-surface-muted border border-theme-border rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-1">
              {t("checkout.amount_due_label")}
            </div>
            <div className="text-3xl font-bold text-fg">
              {formatPrice(total, displayCurrency)}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">
              {t("orders.payment_method_label")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {methods.map((method) => (
                <Button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={isProcessing}
                  className={`h-16 text-base font-semibold ${
                    selectedMethod === method.id
                      ? "bg-primary text-white shadow"
                      : "bg-surface border border-theme-border hover:bg-surface-hover text-fg"
                  }`}
                >
                  {method.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 h-14 text-lg font-medium"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !selectedMethod}
            className="flex-1 h-14 text-lg font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing
              ? t("common.processing")
              : t("orders.record_payment")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
