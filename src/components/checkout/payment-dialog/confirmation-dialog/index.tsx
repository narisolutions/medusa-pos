import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/helpers";
import { useCheckout } from "../../hooks";
import { useTranslation } from "@/i18n";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  total: number;
  /** Overrides the default explanation, e.g. for a bank transfer. */
  message?: string;
  confirmLabel?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  isProcessing,
  total,
  message,
  confirmLabel,
}) => {
  const { currency } = useCheckout();
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-2xl font-semibold text-fg text-center">
          {t("checkout.confirm_payment_title")}
        </DialogTitle>

        <div className="space-y-6 py-4">
          <p className="text-lg text-fg-muted text-center">
            {message ?? t("checkout.confirm_payment_message")}
          </p>

          <div className="bg-surface-muted border border-theme-border rounded-lg p-4">
            <p className="text-center text-fg-muted font-medium">
              {t("checkout.amount_label")}:{" "}
              <span className="text-amount tabular-nums text-fg">
                {formatPrice(total, currency)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            size="lg"
            className="flex-1 text-lg"
            disabled={isProcessing}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            variant="success"
            size="lg"
            loading={isProcessing}
            className="flex-1 text-lg"
          >
            {isProcessing ? t("common.processing") : confirmLabel ?? t("checkout.payment_successful_button")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
