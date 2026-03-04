import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { formatPrice } from "@/utils/helpers";
import constants from "@/utils/constants";

interface ItemsProps {
  order: AdminOrder;
  isNegativeFulfillmentStatus: boolean;
  onOpenFulfillmentDialog: () => void;
}

const Items: React.FC<ItemsProps> = ({
  order,
  isNegativeFulfillmentStatus,
  onOpenFulfillmentDialog,
}) => {
  const { items } = order;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            <span className="text-base text-gray-500">({items?.length || 0} items)</span>
          </div>
          {isNegativeFulfillmentStatus &&
            order?.customer?.email !== constants.ORDER_GUEST_EMAIL && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenFulfillmentDialog}
                  className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2.5 px-5 touch-manipulation whitespace-nowrap"
                >
                  Fulfill items
                </Button>
              </div>
            )}
        </div>
      </div>
      <div className="p-6 space-y-3 overflow-y-auto flex-1 min-h-0">
        {items?.map((item, index) => {
          const metadata = item.metadata as { public?: { vintage?: string; volume?: string } };
          const vintage = metadata?.public?.vintage ? String(metadata?.public?.vintage) : null;
          const volume = metadata?.public?.volume ? String(metadata?.public?.volume) : null;

          return (
            <div
              key={item.id || index}
              className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-1">
                {item.product_title && item.product_title !== item.variant_title ? (
                  <>
                    <h3 className="text-base font-medium text-gray-900">{item.product_title}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-gray-600">{item.variant_title}</p>
                      {(vintage || volume) && (
                        <div className="flex items-center gap-1.5">
                          {vintage && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                              {vintage}
                            </span>
                          )}
                          {volume && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                              {volume}ml
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-gray-900">{item.variant_title}</h3>
                    {(vintage || volume) && (
                      <div className="flex items-center gap-1.5">
                        {vintage && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                            {vintage}
                          </span>
                        )}
                        {volume && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                            {volume}ml
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-base text-gray-600 mb-1">
                  Qty: {item.quantity} × {formatPrice(item.total)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{formatPrice(item.total)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Items;

