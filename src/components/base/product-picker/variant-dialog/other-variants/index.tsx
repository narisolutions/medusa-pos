import React from "react";
import { Ban, Layers, TriangleAlert } from "lucide-react";
import { useQueryProducts } from "@/hooks/queries/useQueryProducts";
import { useSalesChannel } from "@/context/sales-channel";
import { formatPrice } from "@/utils/helpers";
import { getVariantAvailableQuantity } from "@/utils/pos/cart";
import { otherVariants, variantLabel, variantPrice } from "@/utils/pos/catalog";
import { useTranslation } from "@/i18n";

interface Props {
  variantId: string;
  currency: string;
}

const OtherVariants: React.FC<Props> = ({ variantId, currency }) => {
  const { t } = useTranslation();
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const { data: products = [] } = useQueryProducts(salesChannelId);
  const variants = otherVariants(products, variantId);

  if (variants.length === 0) return null;

  return (
    <div className="mt-6 border-t border-theme-border pt-4">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Layers size={16} />
        {t("checkout.other_variants_title")}
      </h3>
      <div className="space-y-2">
        {variants.map((variant) => {
          const quantity = getVariantAvailableQuantity(variant);
          const { amount, original } = variantPrice(variant);
          const isOut = quantity === 0;
          const isLow = typeof quantity === "number" && quantity > 0 && quantity <= 5;

          return (
            <div
              key={variant.id}
              className="flex items-center gap-3 rounded border border-theme-border bg-surface-muted p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-medium text-fg">
                  {variantLabel(variant) || variant.title}
                </div>
                {variant.sku && (
                  <div className="text-base text-fg-subtle">
                    {t("checkout.sku_label")}
                    {variant.sku}
                  </div>
                )}
              </div>
              {typeof quantity === "number" && (
                <span
                  className={`inline-flex items-center gap-1 text-base ${
                    isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-fg-muted"
                  }`}
                >
                  {isOut && <Ban className="size-4" aria-hidden />}
                  {isLow && <TriangleAlert className="size-4" aria-hidden />}
                  {isOut
                    ? t("checkout.out_of_stock")
                    : quantity === 1
                      ? t("checkout.last_one")
                      : isLow
                        ? t("checkout.only_n_left", { count: quantity })
                        : t("checkout.in_stock", { count: quantity })}
                </span>
              )}
              <div className="text-right">
                {original !== null && (
                  <div className="text-base text-fg-subtle line-through">
                    {formatPrice(original, currency)}
                  </div>
                )}
                <div className={`text-base font-semibold ${original !== null ? "text-red-600" : "text-fg"}`}>
                  {formatPrice(amount, currency)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OtherVariants;
