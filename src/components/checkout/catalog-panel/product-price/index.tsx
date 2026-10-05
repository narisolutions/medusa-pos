import React from "react";
import { AdminProduct } from "@medusajs/types";
import { formatPrice } from "@/utils/helpers";
import { cheapestVariant, productPriceRange, variantPrice } from "@/utils/pos/catalog";
import { useTranslation } from "@/i18n";

interface Props {
  product: AdminProduct;
  currency: string;
}

const ProductPrice: React.FC<Props> = ({ product, currency }) => {
  const { t } = useTranslation();
  const range = productPriceRange(product);
  if (!range) return null;

  const cheapest = cheapestVariant(product);
  const { original } = cheapest ? variantPrice(cheapest) : { original: null };
  const price = formatPrice(range.min, currency);

  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {original !== null && range.min === range.max && (
        <span className="text-base text-fg-subtle line-through">
          {formatPrice(original, currency)}
        </span>
      )}
      <span className={`text-lg font-semibold ${original !== null ? "text-red-600" : "text-fg"}`}>
        {range.min === range.max ? price : t("checkout.catalog_from_price", { price })}
      </span>
    </span>
  );
};

export default ProductPrice;
