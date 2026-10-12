import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Calendar } from "lucide-react";
import { formatPrice, formatDate, getOrderCurrency } from "@/utils/helpers";
import { useTranslation } from "@/i18n";
import OrderStatusChip from "@/components/base/order-status-chip";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import {
  getOrderPaymentMethodLabel,
  getOrderRefundedTotal,
  getOrderSaleTotal,
} from "@/utils/pos/payment";

interface DetailsProps {
  order: AdminOrder;
}

const Details: React.FC<DetailsProps> = ({ order }) => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const {
    display_id,
    created_at,
    currency_code,
    payment_status,
    sales_channel,
  } = order;

  const paymentMethodLabel = getOrderPaymentMethodLabel(order, store);
  const refundedTotal = getOrderRefundedTotal(order);
  const saleTotal = getOrderSaleTotal(order);

  const currency = getOrderCurrency(order);

  return (
    <div className="bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-theme-border bg-surface-muted">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-fg-muted" />
          <h2 className="text-lg font-semibold text-fg">{t("orders.order_payment_details_header")}</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">{t("orders.order_id_label")}</span>
            <span className="font-medium text-fg">#{display_id}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">{t("orders.created_label")}</span>
            <span className="font-medium text-fg">{formatDate(created_at)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">{t("orders.currency_label")}</span>
            <span className="font-medium text-fg">
              {currency_code?.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">{t("orders.payment_status_label")}</span>
            <OrderStatusChip kind="payment" status={payment_status} />
          </div>
          {paymentMethodLabel && (
            <div className="flex justify-between text-base">
              <span className="text-fg-muted">{t("orders.payment_method_label")}</span>
              <span className="font-medium text-fg">{paymentMethodLabel}</span>
            </div>
          )}
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">{t("orders.payment_amount_label")}</span>
            <span className="font-medium text-fg">
              {formatPrice(saleTotal, currency)}
            </span>
          </div>
          {refundedTotal > 0 && (
            <div className="flex justify-between text-base">
              <span className="text-fg-muted">{t("orders.refunded_label")}</span>
              <span className="font-medium text-danger-text tabular-nums">
                -{formatPrice(refundedTotal, currency)}
              </span>
            </div>
          )}
          {sales_channel && (
            <div className="flex justify-between text-base">
              <span className="text-fg-muted">{t("orders.sales_channel_label")}</span>
              <span className="font-medium text-fg">{sales_channel.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Details;

