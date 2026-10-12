import React from "react";
import { AdminProductVariant } from "@medusajs/types";
import { Stepper } from "@/components/ui/stepper";
import { formatPrice } from "@/utils/helpers";
import { getVariantAvailableQuantity, getVariantUnitPrice } from "@/utils/pos/cart";
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
          const available = getVariantAvailableQuantity(variant);
          return (
            <div key={variant.id} className="flex items-center gap-4 p-3">
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-fg truncate">{lineTitle(variant)}</div>
                <div className="text-base text-fg-muted">{formatPrice(unit, currency)}</div>
              </div>
              {/* Down to 0 takes the line off, as the − did before. */}
              <Stepper
                value={quantity}
                min={0}
                max={typeof available === "number" ? available : undefined}
                disabled={disabled}
                onChange={(next) => changeQuantity(variant.id, next - quantity)}
              />
              <div className="w-28 text-right text-base font-semibold tabular-nums text-fg">
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
