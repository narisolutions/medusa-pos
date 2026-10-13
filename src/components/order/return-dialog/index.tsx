import React from "react";
import { AdminOrder } from "@medusajs/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PostSaleDifference from "../post-sale-difference";
import ReturnLines from "../return-lines";
import { useTranslation } from "@/i18n";
import type { PostSaleSlipDraft } from "@/utils/pos/receipt/post-sale-slip";
import { useReturnItems } from "./hooks";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder;
  /** Called with the backend's outstanding amount once the return is applied. */
  onReturned: (outstanding: number, slip: PostSaleSlipDraft) => void;
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
        showCloseButton={!isBusy}
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
        </div>

        {/* The difference and the decision stay in view while long line lists scroll. */}
        <DialogFooter sticky className="block space-y-3">
          <PostSaleDifference currency={currency} goingOut={0} comingBack={comingBack} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={isBusy} className="flex-1 text-lg">
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
              loading={isBusy}
              className="flex-2 text-lg font-semibold"
            >
              {progressLabel ?? t("orders.post_sale.return_confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnDialog;
