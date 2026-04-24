import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Receipt } from "lucide-react";
import { formatPrice } from "@/utils/helpers";
import constants from "@/utils/constants";
import { useTranslation } from "@/i18n";

interface SummaryProps {
  order: AdminOrder;
}

const Summary: React.FC<SummaryProps> = ({ order }) => {
  const { t } = useTranslation();
  const {
    subtotal,
    discount_total,
    shipping_total,
    tax_total,
    total,
    currency_code,
    items,
    metadata,
  } = order;

  const itemDiscountsTotal = (items ?? []).reduce((acc, item) => {
    const meta = item.metadata as {
      item_discount?: { type: "amount" | "percent"; value: number };
      original_unit_price?: number;
    } | null | undefined;
    if (!meta?.item_discount) return acc;
    const { type, value } = meta.item_discount;
    if (type === "amount") return acc + value * item.quantity;
    const base = meta.original_unit_price ?? item.unit_price ?? 0;
    return acc + (base * value / 100) * item.quantity;
  }, 0);

  const orderMeta = metadata as {
    order_discount?: { type: "amount" | "percent"; value: number };
  } | null | undefined;
  let orderDiscountAmount = 0;
  if (orderMeta?.order_discount?.value) {
    const { type, value } = orderMeta.order_discount;
    const base = (subtotal ?? 0) - itemDiscountsTotal;
    orderDiscountAmount = type === "percent"
      ? (base * value) / 100
      : Math.min(value, base);
  }

  const displayed_discount = (discount_total ?? 0) + itemDiscountsTotal + orderDiscountAmount;

  const currency =
    currency_code || constants.CHECKOUT_CONFIG.CURRENCY;

  return (
    <div className="bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-theme-border bg-surface-muted">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-fg-muted" />
          <h2 className="text-lg font-semibold text-fg">{t("orders.order_summary_header")}</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-base text-fg-muted">{t("orders.subtotal_label")}</p>
            <p className="text-lg font-semibold text-fg">
              {formatPrice(subtotal || 0, currency)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-base text-fg-muted">{t("orders.discount_label")}</p>
          <div
            className={`text-lg font-semibold ${
              displayed_discount > 0 ? "text-red-600" : "text-fg"
            }`}
          >
            {displayed_discount > 0 ? "-" : ""}
            {formatPrice(displayed_discount, currency)}
          </div>
          </div>
          <div className="text-center">
            <p className="text-base text-fg-muted">{t("orders.shipping_label")}</p>
            <p className="text-lg font-semibold text-fg">
              {formatPrice(shipping_total || 0, currency)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-base text-fg-muted">{t("orders.vat_label")}</p>
            <p className="text-lg font-semibold text-fg">
              {formatPrice(tax_total || 0, currency)}
            </p>
          </div>
          <div className="text-center col-span-2 border-t border-theme-border pt-4 mt-2">
            <p className="text-base text-fg-muted">{t("orders.total_label")}</p>
            <p className="text-2xl font-bold text-fg">
              {formatPrice(total, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;

