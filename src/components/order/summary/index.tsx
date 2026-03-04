import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Receipt } from "lucide-react";
import { formatPrice } from "@/utils/helpers";

interface SummaryProps {
  order: AdminOrder;
}

const Summary: React.FC<SummaryProps> = ({ order }) => {
  const { subtotal, discount_total, shipping_total, tax_total, total } = order;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-base text-gray-600">Subtotal</p>
            <p className="text-lg font-semibold text-gray-900">{formatPrice(subtotal || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-base text-gray-600">Discount</p>
            <p
              className={`text-lg font-semibold ${discount_total > 0 ? "text-red-600" : "text-gray-900"}`}
            >
              {discount_total > 0 ? "-" : ""}
              {formatPrice(discount_total || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-base text-gray-600">Shipping</p>
            <p className="text-lg font-semibold text-gray-900">{formatPrice(shipping_total || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-base text-gray-600">VAT</p>
            <p className="text-lg font-semibold text-gray-900">{formatPrice(tax_total || 0)}</p>
          </div>
          <div className="text-center col-span-2 border-t border-gray-200 pt-4 mt-2">
            <p className="text-base text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatPrice(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;

