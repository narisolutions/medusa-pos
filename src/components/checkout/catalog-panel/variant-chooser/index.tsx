import React from "react";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import ItemDialog from "@/components/base/product-picker/variant-dialog";
import { formatPrice } from "@/utils/helpers";
import { getVariantAvailableQuantity } from "@/utils/pos/cart";
import { variantLabel, variantPrice } from "@/utils/pos/catalog";
import { useTranslation } from "@/i18n";
import StockBadge from "../stock-badge";

interface Props {
  product: AdminProduct | null;
  currency: string;
  onClose: () => void;
  /** Returns whether the variant was added; a refusal keeps the chooser open. */
  onPick: (variant: AdminProductVariant, product: AdminProduct) => boolean;
}

const VariantChooser: React.FC<Props> = ({ product, currency, onClose, onPick }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogTitle className="pr-12 text-xl font-semibold">{product?.title}</DialogTitle>
        <DialogDescription className="text-base text-fg-muted">
          {t("checkout.catalog_choose_variant")}
        </DialogDescription>
        <div className="flex flex-col gap-2">
          {product?.variants?.map((variant) => {
            const quantity = getVariantAvailableQuantity(variant);
            const isOut = quantity === 0;
            const isLow = typeof quantity === "number" && quantity > 0 && quantity <= 5;
            const { amount, original } = variantPrice(variant);

            return (
              <div key={variant.id} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isOut}
                  onClick={() => {
                    if (onPick(variant, product)) onClose();
                  }}
                  className="flex min-h-14 flex-1 items-center gap-4 rounded-lg border border-theme-border bg-surface px-4 py-2 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex flex-1 flex-col">
                    <span className="text-base font-medium text-fg">
                      {variantLabel(variant) || product.title}
                    </span>
                    {variant.sku && (
                      <span className="text-base text-fg-muted">
                        {t("checkout.sku_label")}
                        {variant.sku}
                      </span>
                    )}
                  </span>
                  {(isOut || isLow) && (
                    <StockBadge state={isOut ? "out" : "low"} count={quantity} />
                  )}
                  <span className="flex flex-col items-end">
                    {original !== null && (
                      <span className="text-base text-fg-subtle line-through">
                        {formatPrice(original, currency)}
                      </span>
                    )}
                    <span
                      className={`text-lg font-semibold ${original !== null ? "text-red-600" : "text-fg"}`}
                    >
                      {formatPrice(amount, currency)}
                    </span>
                  </span>
                </button>
                <ItemDialog
                  item={{ ...variant, product }}
                  currency={currency}
                  triggerClassName="size-12 rounded-full"
                />
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VariantChooser;
