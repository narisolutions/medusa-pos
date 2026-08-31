import React from "react";
import { AdminDraftOrder } from "@medusajs/types";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice, getOrderCurrency } from "@/utils/helpers";
import { useTranslation } from "@/i18n";
import { parkLabelOf } from "../hooks";

type Props = {
  draftOrder: AdminDraftOrder | null;
  isDiscarding: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const DiscardDialog: React.FC<Props> = ({
  draftOrder,
  isDiscarding,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={!!draftOrder} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 className="size-7 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-2xl font-semibold">
            {t("parked.discard_title")}
          </DialogTitle>
          {/* Names the sale and its total so the wrong one cannot go by muscle memory. */}
          <p className="text-base text-muted-foreground">
            {draftOrder &&
              t("parked.discard_message", {
                label: parkLabelOf(draftOrder),
                total: formatPrice(
                  draftOrder.total,
                  getOrderCurrency(draftOrder)
                ),
              })}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <Button
            size="lg"
            disabled={isDiscarding}
            onClick={onConfirm}
            className="h-16 bg-red-600 hover:bg-red-700 text-white text-base"
          >
            {isDiscarding ? t("parked.discarding") : t("parked.discard_button")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={isDiscarding}
            onClick={onClose}
            className="h-16 text-base"
          >
            {t("common.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscardDialog;
