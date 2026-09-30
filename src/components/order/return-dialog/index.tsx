import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PostSaleDifference from "../post-sale-difference";
import ReturnLines from "../return-lines";
import { useTranslation } from "@/i18n";
import { useReturnItems } from "./hooks";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder;
  /** Called with the backend's outstanding amount once the return is applied. */
  onReturned: (outstanding: number) => void;
}

const ReturnDialog: React.FC<Props> = ({ isOpen, onClose, order, onReturned }) => {
  const { t } = useTranslation();
  const {
    currency,
    lines,
    selection,
    change,
    note,
    setNote,
    comingBack,
    canConfirm,
    handleConfirm,
    isBusy,
    progressLabel,
  } = useReturnItems(order, isOpen, onClose, onReturned);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isBusy && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
        preventOutsideClose={isBusy}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-fg">
            {t("orders.post_sale.return_title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("orders.post_sale.return_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <ReturnLines lines={lines} selection={selection} change={change} disabled={isBusy} />

          <div>
            <label htmlFor="return-note" className="block text-base font-medium text-fg mb-2">
              {t("orders.post_sale.return_note_label")}
            </label>
            <Input
              id="return-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("orders.post_sale.return_note_placeholder")}
              disabled={isBusy}
            />
          </div>

          <PostSaleDifference currency={currency} goingOut={0} comingBack={comingBack} />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
              className="flex-1 h-14 text-lg font-medium"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isBusy || !canConfirm}
              className="flex-1 h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
            >
              {isBusy && <Loader2 className="size-5 mr-2 animate-spin" />}
              {progressLabel ?? t("orders.post_sale.return_confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnDialog;
