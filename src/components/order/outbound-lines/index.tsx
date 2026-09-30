import React from "react";
import { AdminProductVariant } from "@medusajs/types";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/helpers";
import { getVariantUnitPrice } from "@/utils/pos/cart";
import { useTranslation } from "@/i18n";
import { lineTitle } from "./hooks";

interface Props {
  lines: { variant: AdminProductVariant; quantity: number }[];
  currency: string;
  changeQuantity: (variantId: string, delta: number) => void;
  disabled: boolean;
}

/** The goods going out, each with its price and a −/+ quantity. */
const OutboundLines: React.FC<Props> = ({ lines, currency, changeQuantity, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-theme-border divide-y divide-theme-border">
      {lines.length === 0 ? (
        <p className="p-4 text-base text-fg-muted text-center">{t("orders.post_sale.add_empty")}</p>
      ) : (
        lines.map(({ variant, quantity }) => {
          const unit = getVariantUnitPrice(variant);
          return (
            <div key={variant.id} className="flex items-center gap-4 p-3">
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-fg truncate">{lineTitle(variant)}</div>
                <div className="text-base text-fg-muted">{formatPrice(unit, currency)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={disabled}
                  onClick={() => changeQuantity(variant.id, -1)}
                  aria-label={t("orders.post_sale.decrease")}
                >
                  <Minus className="size-5" />
                </Button>
                <span className="w-10 text-center text-lg font-semibold">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={disabled}
                  onClick={() => changeQuantity(variant.id, 1)}
                  aria-label={t("orders.post_sale.increase")}
                >
                  <Plus className="size-5" />
                </Button>
              </div>
              <div className="w-28 text-right text-base font-semibold text-fg">
                {formatPrice(unit * quantity, currency)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default OutboundLines;
