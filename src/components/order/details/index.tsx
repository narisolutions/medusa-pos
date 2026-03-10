import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Calendar } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/helpers";

interface DetailsProps {
  order: AdminOrder;
  getPaymentStatusColor: (status: string) => string;
  formatStatusText: (status: string) => string;
}

const Details: React.FC<DetailsProps> = ({
  order,
  getPaymentStatusColor,
  formatStatusText,
}) => {
  const {
    display_id,
    created_at,
    currency_code,
    payment_status,
    total,
    sales_channel,
  } = order;

  return (
    <div className="bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-theme-border bg-surface-muted">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-fg-muted" />
          <h2 className="text-lg font-semibold text-fg">Order & Payment Details</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">Order ID</span>
            <span className="font-medium text-fg">#{display_id}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">Created</span>
            <span className="font-medium text-fg">{formatDate(created_at)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">Currency</span>
            <span className="font-medium text-fg">
              {currency_code?.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">Payment Status</span>
            <div className="flex items-center gap-2">
              <span
                className={`${getPaymentStatusColor(payment_status)} w-2.5 h-2.5 rounded-full shrink-0`}
              />
              <span className="font-medium text-fg">
                {formatStatusText(payment_status)}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-fg-muted">Payment Amount</span>
            <span className="font-medium text-fg">{formatPrice(total)}</span>
          </div>
          {sales_channel && (
            <div className="flex justify-between text-base">
              <span className="text-fg-muted">Sales Channel</span>
              <span className="font-medium text-fg">{sales_channel.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Details;

