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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Order & Payment Details</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Order ID</span>
            <span className="font-medium text-gray-900">#{display_id}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Created</span>
            <span className="font-medium text-gray-900">{formatDate(created_at)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Currency</span>
            <span className="font-medium text-gray-900">
              {currency_code?.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Payment Status</span>
            <div className="flex items-center gap-2">
              <span
                className={`${getPaymentStatusColor(payment_status)} w-2.5 h-2.5 rounded-full shrink-0`}
              />
              <span className="font-medium text-gray-900">
                {formatStatusText(payment_status)}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Payment Amount</span>
            <span className="font-medium text-gray-900">{formatPrice(total)}</span>
          </div>
          {sales_channel && (
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Sales Channel</span>
              <span className="font-medium text-gray-900">{sales_channel.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Details;

