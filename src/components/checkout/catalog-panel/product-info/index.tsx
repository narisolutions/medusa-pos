import React from "react";
import { AdminProduct } from "@medusajs/types";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import ItemDialog from "@/components/base/product-picker/variant-dialog";
import { useTranslation } from "@/i18n";

interface Props {
  product: AdminProduct;
  currency: string;
  onOpenVariants: (product: AdminProduct) => void;
}

/** One variant: its details. Several: the chooser, where each variant has its own details. */
const ProductInfo: React.FC<Props> = ({ product, currency, onOpenVariants }) => {
  const { t } = useTranslation();
  const variants = product.variants ?? [];

  if (variants.length === 1) {
    return (
      <ItemDialog
        item={{ ...variants[0], product }}
        currency={currency}
        triggerClassName="size-12 rounded-full"
      />
    );
  }

  if (variants.length === 0) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label={t("checkout.catalog_choose_variant")}
      onClick={() => onOpenVariants(product)}
    >
      <Info size={20} className="text-blue-600" />
    </Button>
  );
};

export default ProductInfo;
