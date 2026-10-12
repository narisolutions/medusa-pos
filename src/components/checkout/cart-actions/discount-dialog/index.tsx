import React, { useState } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Numpad } from "@/components/ui/numpad";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useCheckout } from "../../hooks";
import { useCartStore } from "@/context/cart";
import { OrderDiscount } from "@/types/utils";
import { getCurrencySymbol } from "@/utils/settings/preferences";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

type DiscountType = "amount" | "percent";

const DiscountModal: React.FC<Props> = ({ open, onClose }) => {
  const selectedItemId = useCartStore((state) => state.selectedItemId);
  const setItemMetadata = useCartStore((state) => state.setItemMetadata);
  const pendingItemDiscount = useCartStore((state) => state.pendingItemDiscount);
  const setPendingItemDiscount = useCartStore((state) => state.setPendingItemDiscount);
  const { items, currency } = useCheckout();
  const { t } = useTranslation();

  const currentItem = items.find((i) => i.variant_id === selectedItemId);
  const currentItemDiscount =
    (currentItem?.metadata?.item_discount as OrderDiscount | null) ?? null;

  const activeDiscount = selectedItemId ? currentItemDiscount : pendingItemDiscount;

  const [discountType, setDiscountType] = useState<DiscountType>(
    activeDiscount?.type || "amount"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    String(activeDiscount?.value ?? 0)
  );
  const [originalDiscount, setOriginalDiscount] = useState<OrderDiscount | null>(null);
  // The prefilled value is typed over, not appended to.
  const [fresh, setFresh] = useState(true);

  useChange(`${open}|${selectedItemId ?? ""}`, () => {
    if (!open) return;
    setDiscountType(activeDiscount?.type || "amount");
    setDiscountValue(String(activeDiscount?.value ?? 0));
    setOriginalDiscount(activeDiscount);
    setFresh(true);
  });

  const handleTypeChange = (type: DiscountType) => {
    setDiscountType(type);
    setDiscountValue(
      originalDiscount && originalDiscount.type === type ? String(originalDiscount.value ?? 0) : "0"
    );
    setFresh(true);
  };

  const value = Number(discountValue) || 0;
  const isValid = discountType === "percent" ? value <= 100 : true;
  const unit = discountType === "percent" ? "%" : getCurrencySymbol(currency);

  const save = (next: number) => {
    if (selectedItemId) {
      setItemMetadata(selectedItemId, {
        item_discount: { type: discountType, value: next },
      });
    } else {
      setPendingItemDiscount(next > 0 ? { type: discountType, value: next } : null);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("checkout.discount_dialog_title")}</DialogTitle>
          <DialogDescription className="text-base">
            {selectedItemId ? (
              <>
                {t("checkout.apply_discount_label")}
                <b className="text-fg">{currentItem?.title}</b>
              </>
            ) : (
              t("checkout.discount_next_item_label")
            )}
          </DialogDescription>
        </DialogHeader>

        <SegmentedControl
          label={t("checkout.discount_type_label")}
          className="w-full"
          value={discountType}
          onChange={handleTypeChange}
          options={[
            { value: "amount", label: `${t("checkout.discount_amount")} (${getCurrencySymbol(currency)})` },
            { value: "percent", label: `${t("checkout.discount_percentage")} (%)` },
          ]}
        />

        <output
          aria-live="polite"
          className={`rounded-lg px-4 py-2 text-center text-total tabular-nums ${isValid ? "" : "text-danger-text"} ${fresh ? "bg-primary/10" : "bg-surface-subtle"}`}
        >
          {discountValue || "0"} {unit}
        </output>

        <Numpad
          value={discountValue}
          onChange={(next) => {
            setDiscountValue(next);
            setFresh(false);
          }}
          onEnter={() => isValid && save(value)}
          enterDisabled={!isValid}
          replace={fresh}
          allowDecimal={true}
          maxDecimals={2}
        />

        {activeDiscount && (
          <Button variant="outline" size="lg" className="w-full text-danger-text" onClick={() => save(0)}>
            {t("checkout.discount_remove")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DiscountModal;
