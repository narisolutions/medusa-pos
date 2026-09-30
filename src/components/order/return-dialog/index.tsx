import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Loader2, Minus, PackageCheck, PackageX, Plus } from "lucide-react";
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
import { useTranslation } from "@/i18n";
import { useReturnItems } from "./hooks";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder;
  /** Called with the backend's outstanding amount once the return is applied. */
  onReturned: (outstanding: number) => void;
}

interface StepperProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  disabled: boolean;
  onChange: (delta: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}

const ConditionStepper: React.FC<StepperProps> = ({
  label,
  icon,
  value,
  disabled,
  onChange,
  decreaseLabel,
  increaseLabel,
}) => (
  <div className="flex items-center gap-2">
    <span className="flex items-center gap-2 w-40 text-base text-fg">
      {icon}
      {label}
    </span>
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled || value === 0}
      onClick={() => onChange(-1)}
      aria-label={`${decreaseLabel}: ${label}`}
    >
      <Minus className="size-5" />
    </Button>
    <span className="w-10 text-center text-lg font-semibold">{value}</span>
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      onClick={() => onChange(1)}
      aria-label={`${increaseLabel}: ${label}`}
    >
      <Plus className="size-5" />
    </Button>
  </div>
);

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
          <div className="rounded-lg border border-theme-border divide-y divide-theme-border">
            {lines.map(({ item, returnable }) => {
              const s = selection[item.id] ?? { restock: 0, damaged: 0 };
              const full = s.restock + s.damaged >= returnable;
              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-base font-medium text-fg">{item.title}</span>
                    <span className="text-base text-fg-muted shrink-0">
                      {t("orders.post_sale.return_returnable", {
                        count: returnable,
                        sold: item.quantity,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <ConditionStepper
                      label={t("orders.post_sale.return_restock")}
                      icon={<PackageCheck className="size-5 text-green-600" />}
                      value={s.restock}
                      disabled={isBusy || (full && s.restock === 0)}
                      onChange={(delta) => change(item.id, "restock", delta, returnable)}
                      decreaseLabel={t("orders.post_sale.decrease")}
                      increaseLabel={t("orders.post_sale.increase")}
                    />
                    <ConditionStepper
                      label={t("orders.post_sale.return_damaged")}
                      icon={<PackageX className="size-5 text-red-600" />}
                      value={s.damaged}
                      disabled={isBusy || (full && s.damaged === 0)}
                      onChange={(delta) => change(item.id, "damaged", delta, returnable)}
                      decreaseLabel={t("orders.post_sale.decrease")}
                      increaseLabel={t("orders.post_sale.increase")}
                    />
                  </div>
                </div>
              );
            })}
          </div>

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
