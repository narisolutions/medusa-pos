import React from "react";
import { AdminProduct } from "@medusajs/types";
import { productStock, variantLabel } from "@/utils/pos/catalog";
import { useTranslation } from "@/i18n";
import ProductInfo from "../product-info";
import ProductPrice from "../product-price";
import StockBadge from "../stock-badge";

interface Props {
  product: AdminProduct;
  currency: string;
  onPick: (product: AdminProduct) => void;
}

const ProductRow: React.FC<Props> = ({ product, currency, onPick }) => {
  const { t } = useTranslation();
  const stock = productStock(product);
  const variants = product.variants ?? [];
  const onlyVariant = variants.length === 1 ? variants[0] : null;
  const detail = onlyVariant
    ? [variantLabel(onlyVariant), onlyVariant.sku && `${t("checkout.sku_label")}${onlyVariant.sku}`]
        .filter(Boolean)
        .join(" • ")
    : t("checkout.catalog_variants", { count: variants.length });

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={stock === "out"}
        onClick={() => onPick(product)}
        className="flex min-h-14 flex-1 items-center gap-4 rounded-lg border border-theme-border bg-surface px-4 py-2 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-medium text-fg">{product.title}</span>
          {detail && <span className="truncate text-base text-fg-muted">{detail}</span>}
        </span>
        {stock !== "in" && <StockBadge state={stock} />}
        <ProductPrice product={product} currency={currency} />
      </button>
      <ProductInfo product={product} currency={currency} onOpenVariants={onPick} />
    </div>
  );
};

export default ProductRow;
