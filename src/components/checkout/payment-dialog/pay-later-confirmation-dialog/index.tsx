import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/helpers";
import { useCheckout } from "../../hooks";
import { useTranslation } from "@/i18n";

interface PayLaterConfirmationDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  total: number;
}

const PayLaterConfirmationDialog: React.FC<PayLaterConfirmationDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  isProcessing,
  total,
}) => {
  const { currency } = useCheckout();
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-2xl font-semibold text-fg text-center">
          {t("checkout.pay_later_confirm_title")}
        </DialogTitle>

        <div className="space-y-6 py-4">
          <p className="text-lg text-fg-muted text-center">
            {t("checkout.pay_later_confirm_message")}
          </p>

          <div className="bg-surface-muted border border-theme-border rounded-lg p-4">
            <p className="text-center text-fg-muted font-medium">
              {t("checkout.amount_due_label")}:{" "}
              <span className="text-2xl font-bold text-fg">
                {formatPrice(total, currency)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-14 text-lg font-medium border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover"
            disabled={isProcessing}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 h-14 text-lg font-medium"
          >
            {isProcessing
              ? t("common.processing")
              : t("checkout.deliver_pay_later_button")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayLaterConfirmationDialog;
