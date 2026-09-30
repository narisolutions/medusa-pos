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
import ProductPicker from "@/components/base/product-picker";
import PostSaleDifference from "../post-sale-difference";
import OutboundLines from "../outbound-lines";
import PaymentMethodPicker from "../payment-method-picker";
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

          <OutboundLines
            lines={lines}
            currency={currency}
            changeQuantity={changeQuantity}
            disabled={isBusy}
          />

          <PostSaleDifference currency={currency} goingOut={goingOut} />

          <PaymentMethodPicker
            methods={methods}
            selected={selectedMethod}
            onSelect={setSelectedMethod}
            disabled={isBusy}
          />

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
