import React from "react";
import { AdminOrder } from "@medusajs/types";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
    canConfirm,
    isUnpaidOrder,
    isBusy,
    progressLabel,
  } = useAddItems(order, isOpen, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isBusy && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto"
        preventOutsideClose={isBusy}
        showCloseButton={!isBusy}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-fg">
            {t("orders.post_sale.add_title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isUnpaidOrder
              ? t("orders.post_sale.add_description_unpaid")
              : t("orders.post_sale.add_description")}
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

          {!isUnpaidOrder && (
            <PaymentMethodPicker
              methods={methods}
              selected={selectedMethod}
              onSelect={setSelectedMethod}
              disabled={isBusy}
            />
          )}

          {(order.payment_status === "authorized" || order.payment_status === "partially_authorized") && (
            <div className="flex items-start gap-3 rounded-lg border border-warning bg-warning-subtle p-4">
              <AlertTriangle className="size-5 shrink-0 text-warning-text mt-0.5" />
              <p className="text-base text-fg">{t("orders.post_sale.add_authorized_warning")}</p>
            </div>
          )}

        </div>

        {/* The difference and the decision stay in view while long line lists scroll. */}
        <DialogFooter sticky className="block space-y-3">
          <PostSaleDifference currency={currency} goingOut={goingOut} settleLater={isUnpaidOrder} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={isBusy} className="flex-1 text-lg">
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="success"
              size="lg"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
              loading={isBusy}
              className="flex-2 text-lg font-semibold"
            >
              {progressLabel ??
                (isUnpaidOrder ? t("orders.post_sale.add_title") : t("orders.post_sale.add_confirm"))}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemsDialog;
