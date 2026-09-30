import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Loader2, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ProductPicker from "@/components/base/product-picker";
import PostSaleDifference from "../post-sale-difference";
import { formatPrice } from "@/utils/helpers";
import { getVariantUnitPrice } from "@/utils/pos/cart";
import { useTranslation } from "@/i18n";
import { useAddItems } from "./hooks";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder;
}

const AddItemsDialog: React.FC<Props> = ({ isOpen, onClose, order }) => {
  const { t } = useTranslation();
  const {
    products,
    currency,
    lines,
    lineTitle,
    goingOut,
    methods,
    selectedMethod,
    setSelectedMethod,
    handleSelect,
    changeQuantity,
    handleConfirm,
    isBusy,
    progressLabel,
  } = useAddItems(order, isOpen, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isBusy && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
        preventOutsideClose={isBusy}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-fg">
            {t("orders.post_sale.add_title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("orders.post_sale.add_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!isBusy && (
            <ProductPicker products={products} currency={currency} onSelect={handleSelect} />
          )}

          <div className="rounded-lg border border-theme-border divide-y divide-theme-border">
            {lines.length === 0 ? (
              <p className="p-4 text-base text-fg-muted text-center">
                {t("orders.post_sale.add_empty")}
              </p>
            ) : (
              lines.map(({ variant, quantity }) => {
                const unit = getVariantUnitPrice(variant);
                return (
                  <div key={variant.id} className="flex items-center gap-4 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium text-fg truncate">
                        {lineTitle(variant)}
                      </div>
                      <div className="text-base text-fg-muted">
                        {formatPrice(unit, currency)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={isBusy}
                        onClick={() => changeQuantity(variant.id, -1)}
                        aria-label={t("orders.post_sale.decrease")}
                      >
                        <Minus className="size-5" />
                      </Button>
                      <span className="w-10 text-center text-lg font-semibold">{quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={isBusy}
                        onClick={() => changeQuantity(variant.id, 1)}
                        aria-label={t("orders.post_sale.increase")}
                      >
                        <Plus className="size-5" />
                      </Button>
                    </div>
                    <div className="w-28 text-right text-base font-semibold text-fg">
                      {formatPrice(unit * quantity, currency)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <PostSaleDifference currency={currency} goingOut={goingOut} />

          <div>
            <div className="text-base font-medium text-fg mb-2">
              {t("orders.payment_method_label")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {methods.map((method) => (
                <Button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={isBusy}
                  aria-pressed={selectedMethod === method.id}
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
              disabled={isBusy || lines.length === 0 || !selectedMethod}
              className="flex-1 h-14 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
            >
              {isBusy && <Loader2 className="size-5 mr-2 animate-spin" />}
              {progressLabel ?? t("orders.post_sale.add_confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemsDialog;
