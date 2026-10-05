import React from "react";
import { AdminProduct } from "@medusajs/types";
import { Image } from "lucide-react";
import { productStock } from "@/utils/pos/catalog";
import { useTranslation } from "@/i18n";
import ProductInfo from "../product-info";
import ProductPrice from "../product-price";
import StockBadge from "../stock-badge";

interface Props {
  product: AdminProduct;
  currency: string;
  onPick: (product: AdminProduct) => void;
}

const ProductTile: React.FC<Props> = ({ product, currency, onPick }) => {
  const { t } = useTranslation();
  const stock = productStock(product);
  const image = product.thumbnail || product.images?.[0]?.url;
  const variantCount = product.variants?.length ?? 0;

  return (
    <div className="relative flex">
      <button
        type="button"
        disabled={stock === "out"}
        onClick={() => onPick(product)}
        className="flex w-full flex-col overflow-hidden rounded-lg border border-theme-border bg-surface text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-surface-muted">
          {image ? (
            <img src={image} alt="" loading="lazy" className="h-full w-full object-contain p-2" />
          ) : (
            <Image className="size-12 text-fg-subtle" aria-hidden />
          )}
          {stock !== "in" && (
            <span className="absolute left-2 top-2">
              <StockBadge state={stock} />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <span className="line-clamp-2 min-h-12 text-base font-medium text-fg">{product.title}</span>
          <span className="min-h-6 text-base text-fg-muted">
            {variantCount > 1 && t("checkout.catalog_variants", { count: variantCount })}
          </span>
          <div className="mt-auto pt-2">
            <ProductPrice product={product} currency={currency} />
          </div>
        </div>
      </button>
      <div className="absolute right-2 top-2 rounded-full bg-surface/90 shadow-sm">
        <ProductInfo product={product} currency={currency} onOpenVariants={onPick} />
      </div>
    </div>
  );
};

export default ProductTile;
