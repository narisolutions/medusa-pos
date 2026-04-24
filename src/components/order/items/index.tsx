import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { formatPrice } from "@/utils/helpers";
import constants from "@/utils/constants";
import { getOrderContactEmail } from "../hooks";
import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();
  const { items, currency_code } = order;
  const currency =
    currency_code || constants.CHECKOUT_CONFIG.CURRENCY;

  const contactEmail = getOrderContactEmail(order);
  const showFulfillButton =
    isNegativeFulfillmentStatus && !!contactEmail;

  return (
    <div className="rounded-lg border border-theme-border overflow-hidden shadow-sm bg-surface flex flex-col h-full">
      <div className="px-6 py-4 border-b border-theme-border bg-surface-muted shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-fg-muted" />
            <h2 className="text-lg font-semibold text-fg">{t("orders.order_items_header")}</h2>
            <span className="text-base text-fg-subtle">({t("orders.items", { count: items?.length || 0 })})</span>
          </div>
          {showFulfillButton && (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenFulfillmentDialog}
                className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2.5 px-5 touch-manipulation whitespace-nowrap"
              >
                {t("orders.fulfill_items_button")}
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="p-6 space-y-3 overflow-y-auto flex-1 min-h-0">
        {items?.map((item, index) => {
          const metadata = item.metadata as { public?: { vintage?: string; volume?: string }; item_discount?: { type: "amount" | "percent"; value: number }; original_unit_price?: number };
          const vintage = metadata?.public?.vintage ? String(metadata?.public?.vintage) : null;
          const volume = metadata?.public?.volume ? String(metadata?.public?.volume) : null;
          const hasManualDiscount = !!metadata?.item_discount;
          const originalUnitPrice = metadata?.original_unit_price;
          const originalTotal = originalUnitPrice != null ? originalUnitPrice * item.quantity : null;

          return (
            <div
              key={item.id || index}
              className="flex items-start justify-between py-3 border-b border-theme-border last:border-b-0"
            >
              <div className="flex-1">
                {item.product_title && item.product_title !== item.variant_title ? (
                  <>
                    <h3 className="text-base font-medium text-fg">{item.product_title}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-fg-muted">{item.variant_title}</p>
                      {(vintage || volume) && (
                        <div className="flex items-center gap-1.5">
                          {vintage && (
                            <span className="text-xs px-2 py-0.5 rounded bg-surface-subtle text-fg-muted font-medium">
                              {vintage}
                            </span>
                          )}
                          {volume && (
                            <span className="text-xs px-2 py-0.5 rounded bg-surface-subtle text-fg-muted font-medium">
                              {volume}ml
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-fg">{item.variant_title}</h3>
                    {(vintage || volume) && (
                      <div className="flex items-center gap-1.5">
                        {vintage && (
                          <span className="text-xs px-2 py-0.5 rounded bg-surface-subtle text-fg-muted font-medium">
                            {vintage}
                          </span>
                        )}
                        {volume && (
                          <span className="text-xs px-2 py-0.5 rounded bg-surface-subtle text-fg-muted font-medium">
                            {volume}ml
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-base text-fg-muted mb-1">
                  {t("orders.qty_label")}: {item.quantity} × {formatPrice(item.total, currency)}
                </p>
              </div>
              <div className="text-right">
                {hasManualDiscount && originalTotal != null ? (
                  <>
                    <p className="text-sm text-fg-muted line-through">
                      {formatPrice(originalTotal, currency)}
                    </p>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatPrice(item.total, currency)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-semibold text-fg">
                    {formatPrice(item.total, currency)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Items;
