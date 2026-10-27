import React, { useMemo } from "react";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { Tile } from "@/components/ui/tile";
import type { ProductPickerResult } from "@/components/base/product-picker/hooks";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getQuickKeys } from "@/utils/settings/store/metadata";
import { quickKeyLabel, resolveQuickKeys } from "@/utils/pos/quick-keys";
import { getVariantAvailableQuantity, getVariantUnitPrice, variantHasPrice } from "@/utils/pos/cart";
import { formatPrice, handleErrorToast } from "@/utils/helpers";
import { playSound } from "@/utils/sounds";
import { useTranslation } from "@/i18n";

interface Props {
  products: AdminProduct[];
  currency: string;
  onSelect: (variant: AdminProductVariant) => ProductPickerResult;
}

/** The store's pinned products as one row of large buttons: one tap adds one. */
const QuickKeys: React.FC<Props> = ({ products, currency, onSelect }) => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const keys = useMemo(() => resolveQuickKeys(getQuickKeys(store), products), [store, products]);

  if (keys.length === 0) return null;

  // No toast on success: the cart line's flash and the beep say it, without piling up.
  const add = (variant: AdminProductVariant) => {
    const result = onSelect(variant);
    if (!result.success) {
      handleErrorToast(result.message || t("checkout.cannot_add_to_cart"));
      void playSound("scanError");
      return;
    }
    void playSound("scan");
  };

  return (
    <nav aria-label={t("checkout.quick_keys_label")} className="grid grid-cols-8 gap-3">
      {keys.map(({ key, variant }) => {
        const outOfStock = getVariantAvailableQuantity(variant) === 0;
        const priced = variantHasPrice(variant);
        return (
          <Tile
            key={key.variant_id}
            disabled={outOfStock || !priced}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => add(variant)}
            label={<span className="line-clamp-2 break-words">{quickKeyLabel(key, variant)}</span>}
            subline={
              outOfStock
                ? t("checkout.out_of_stock")
                : priced
                  ? formatPrice(getVariantUnitPrice(variant), currency)
                  : t("checkout.no_price")
            }
          />
        );
      })}
    </nav>
  );
};

export default QuickKeys;
