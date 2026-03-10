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
    <div className="bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-theme-border bg-surface-muted">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-fg-muted" />
          <h2 className="text-lg font-semibold text-fg">Order Summary</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-base text-fg-muted">Subtotal</p>
            <p className="text-lg font-semibold text-fg">{formatPrice(subtotal || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-base text-fg-muted">Discount</p>
            <p
              className={`text-lg font-semibold ${discount_total > 0 ? "text-red-600" : "text-fg"}`}
            >
              {discount_total > 0 ? "-" : ""}
              {formatPrice(discount_total || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-base text-fg-muted">Shipping</p>
            <p className="text-lg font-semibold text-fg">{formatPrice(shipping_total || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-base text-fg-muted">VAT</p>
            <p className="text-lg font-semibold text-fg">{formatPrice(tax_total || 0)}</p>
          </div>
          <div className="text-center col-span-2 border-t border-theme-border pt-4 mt-2">
            <p className="text-base text-fg-muted">Total</p>
            <p className="text-2xl font-bold text-fg">{formatPrice(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;

