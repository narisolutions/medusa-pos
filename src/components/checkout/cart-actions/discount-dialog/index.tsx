import React, { Fragment, useState } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Numpad } from "@/components/ui/numpad";
import { useCheckout } from "../../hooks";
import { useCartStore } from "@/context/cart";
import { OrderDiscount } from "@/types/utils";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

const DiscountModal: React.FC<Props> = ({ open, onClose }) => {
  const { selectedItemId, setItemMetadata, pendingItemDiscount, setPendingItemDiscount } = useCartStore();
  const { items } = useCheckout();
  const { t } = useTranslation();

  const currentItem = items.find((i) => i.variant_id === selectedItemId);
  const currentItemDiscount =
    (currentItem?.metadata?.item_discount as OrderDiscount | null) ?? null;

  const activeDiscount = selectedItemId ? currentItemDiscount : pendingItemDiscount;

  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    activeDiscount?.type || "amount"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    String(activeDiscount?.value ?? 0)
  );
  const [originalDiscount, setOriginalDiscount] = useState<OrderDiscount | null>(null);

  useChange(`${open}|${selectedItemId ?? ""}`, () => {
    if (!open) return;
    if (activeDiscount) {
      setDiscountType(activeDiscount.type || "amount");
      setDiscountValue(String(activeDiscount.value ?? 0));
      setOriginalDiscount(activeDiscount);
    } else {
      setDiscountType("amount");
      setDiscountValue("0");
      setOriginalDiscount(null);
    }
  });

  const handleTypeChange = (type: "amount" | "percent") => {
    setDiscountType(type);
    if (originalDiscount && originalDiscount.type === type) {
      setDiscountValue(String(originalDiscount.value ?? 0));
    } else {
      setDiscountValue("0");
    }
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setDiscountValue("0");
      setDiscountType("amount");
    }
  };

  const onApply = () => {
    const value = Number(discountValue) || 0;

    if (selectedItemId) {
      setItemMetadata(selectedItemId, {
        item_discount: { type: discountType, value },
      });
    } else {
      setPendingItemDiscount(value > 0 ? { type: discountType, value } : null);
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-xl font-semibold">{t("checkout.discount_dialog_title")}</DialogTitle>
        <div className="space-y-4">
          <Fragment>
            <label className="text-sm text-fg-muted">
              {selectedItemId
                ? <>{t("checkout.apply_discount_label")}<b>{currentItem?.title}</b></>
                : t("checkout.discount_next_item_label")}
            </label>

            <div className="space-y-2">
              <label className="text-sm text-fg-muted">{t("checkout.discount_type_label")}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="item-discount-type"
                    checked={discountType === "amount"}
                    onChange={() => handleTypeChange("amount")}
                    className="w-4 h-4 border-theme-border-strong text-primary focus:ring-primary/30"
                  />
                  <span className="text-sm">{t("checkout.discount_amount")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="item-discount-type"
                    checked={discountType === "percent"}
                    onChange={() => handleTypeChange("percent")}
                    className="w-4 h-4 border-theme-border-strong text-primary focus:ring-primary/30"
                  />
                  <span className="text-sm">{t("checkout.discount_percentage")}</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-fg-muted">
                {t("checkout.discount_value_label")}{discountType === "percent" && "(%)"}
                {discountType === "amount" && `(${t("checkout.discount_amount")})`}
              </label>
              <div className="text-2xl font-semibold text-center p-3 border border-theme-border-strong rounded-md bg-surface-muted">
                {discountValue || "0"}
              </div>
            </div>

            <Numpad
              value={discountValue}
              onChange={setDiscountValue}
              onEnter={onApply}
              allowDecimal={true}
            />
          </Fragment>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountModal;
