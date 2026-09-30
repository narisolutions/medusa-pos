import { useCallback, useState } from "react";
import { AdminProductVariant } from "@medusajs/types";
import { useTranslation } from "@/i18n";
import type { ProductPickerResult } from "@/components/base/product-picker/hooks";
import { getVariantAvailableQuantity, getVariantUnitPrice } from "@/utils/pos/cart";
import { variantLineTitle } from "@/utils/pos/post-sale";

type OutboundLine = { variant: AdminProductVariant; quantity: number };

const lineTitle = (variant: AdminProductVariant) => variantLineTitle(variant);

/** Goods going out to the customer, picked like at checkout and capped at stock. */
const useOutboundLines = () => {
  const { t } = useTranslation();
  const [lines, setLines] = useState<OutboundLine[]>([]);

  const handleSelect = useCallback(
    (variant: AdminProductVariant): ProductPickerResult => {
      const current = lines.find((l) => l.variant.id === variant.id)?.quantity ?? 0;
      const available = getVariantAvailableQuantity(variant);
      if (typeof available === "number" && current + 1 > available) {
        return { success: false, message: t("checkout.out_of_stock") };
      }
      setLines((prev) =>
        current > 0
          ? prev.map((l) => (l.variant.id === variant.id ? { ...l, quantity: l.quantity + 1 } : l))
          : [...prev, { variant, quantity: 1 }]
      );
      const title = lineTitle(variant);
      return {
        success: true,
        message:
          current > 0
            ? t("checkout.quantity_increased", { title })
            : t("checkout.item_added", { title }),
      };
    },
    [lines, t]
  );

  const changeQuantity = useCallback((variantId: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.variant.id !== variantId) return l;
          const available = getVariantAvailableQuantity(l.variant);
          const next = l.quantity + delta;
          return typeof available === "number" && next > available ? l : { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const reset = useCallback(() => setLines([]), []);

  const goingOut = lines.reduce(
    (sum, line) => sum + getVariantUnitPrice(line.variant) * line.quantity,
    0
  );

  const slipLines = lines.map((l) => ({
    title: lineTitle(l.variant),
    quantity: l.quantity,
    unitPrice: getVariantUnitPrice(l.variant),
  }));

  return { lines, handleSelect, changeQuantity, reset, goingOut, slipLines };
};

export { useOutboundLines, lineTitle };
