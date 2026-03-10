import React, { Fragment, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Numpad } from "@/components/ui/numpad";
import { useCheckout } from "../../hooks";
import { useCartStore } from "@/context/cart";
import { OrderDiscount } from "@/types/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

const DiscountModal: React.FC<Props> = ({ open, onClose }) => {
  const { selectedItemId, setItemMetadata } = useCartStore();
  const { items } = useCheckout();

  const currentItem = items.find((i) => i.variant_id === selectedItemId);
  const currentItemDiscount =
    (currentItem?.metadata?.item_discount as OrderDiscount | null) ?? null;

  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    currentItemDiscount?.type || "amount"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    String(currentItemDiscount?.value ?? 0)
  );
  const [originalDiscount, setOriginalDiscount] = useState<OrderDiscount | null>(null);

  // Update local state when dialog opens or item/discount changes
  useEffect(() => {
    if (open) {
      if (currentItemDiscount) {
        setDiscountType(currentItemDiscount.type || "amount");
        setDiscountValue(String(currentItemDiscount.value ?? 0));
        setOriginalDiscount(currentItemDiscount);
      } else {
        setDiscountType("amount");
        setDiscountValue("0");
        setOriginalDiscount(null);
      }
    }
  }, [open, currentItemDiscount, selectedItemId]);

  const handleTypeChange = (type: "amount" | "percent") => {
    setDiscountType(type);
    // If switching back to the original type, restore the original value
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
    if (!selectedItemId) return;

    const value = Number(discountValue) || 0;
    setItemMetadata(selectedItemId, {
      item_discount: { type: discountType, value },
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-xl font-semibold">Item Discount</DialogTitle>
        <div className="space-y-4">
          {selectedItemId ? (
            <Fragment>
              <label className="text-sm text-fg-muted">
                Apply discount to: <b>{currentItem?.title}</b>
              </label>

              <div className="space-y-2">
                <label className="text-sm text-fg-muted">Discount Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="item-discount-type"
                      checked={discountType === "amount"}
                      onChange={() => handleTypeChange("amount")}
                      className="w-4 h-4 border-theme-border-strong text-primary focus:ring-primary/30"
                    />
                    <span className="text-sm">Amount</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="item-discount-type"
                      checked={discountType === "percent"}
                      onChange={() => handleTypeChange("percent")}
                      className="w-4 h-4 border-theme-border-strong text-primary focus:ring-primary/30"
                    />
                    <span className="text-sm">Percentage</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-fg-muted">
                  Discount Value {discountType === "percent" && "(%)"}
                  {discountType === "amount" && "(Amount)"}
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
          ) : (
            <div className="flex h-[400px] w-full items-center justify-center rounded-md border border-theme-border-strong bg-surface-muted text-base text-fg-subtle">
              Please select an item to apply a discount.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountModal;
