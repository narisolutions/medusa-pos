import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CartItem } from "@/types/utils";
import { AdminProductVariant, AdminProduct } from "@medusajs/types";
import { formatPrice } from "@/utils/helpers";
import { Image, Info, Package, LoaderCircle } from "lucide-react";
import { useItemDialog } from "./hooks";
import { useCheckout } from "../../hooks";

interface Props {
  item: CartItem | (AdminProductVariant & { product: AdminProduct });
  onDialogClick?: () => void;
  onDialogClose?: () => void;
}

const ItemDialog: React.FC<Props> = ({
  item,
  onDialogClick,
  onDialogClose,
}) => {
  const [open, setOpen] = useState(false);

  const {
    title,
    unit_price,
    productTitle,
    sku,
    ean,
    thumbnail,
    originalPrice,
    optionsDisplay,
    availableQuantity,
    hasDiscount,
    discountAmount,
    discountPercentage,
    hasManualDiscount,
    manualDiscount,
    priceAfterManualDiscount,
    isOutOfStock,
    isLastOne,
    isFewLeft,
    isInventoryKit,
    inventoryKitItems,
    isLoadingKitItems,
    kitItemsError,
  } = useItemDialog(item, open);

  const { currency } = useCheckout();

  // Extract comment from metadata if it exists
  const itemComment = 
    'metadata' in item && item.metadata?.comment 
      ? (item.metadata.comment as string)
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          onDialogClose?.();
        }
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="p-1 h-auto"
        data-dialog-trigger="true"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDialogClick?.();
          setOpen(true);
        }}
      >
        <Info size={20} className="cursor-pointer text-blue-600" />
      </Button>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            Item Details
            {isInventoryKit && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                <Package size={12} />
                Kit
              </div>
            )}
          </DialogTitle>

          {thumbnail ? (
            <div className="flex justify-center">
              <img
                src={String(thumbnail)}
                alt="Product"
                className="w-40 h-40 object-contain"
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <Image size={80} className="text-fg-subtle" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-start p-3 bg-[--color-bg-base] rounded">
              <span className="text-fg-muted font-medium">Product:</span>
              <div className="text-right">
                <div className="font-medium">{productTitle || "-"}</div>
                {title && <div className="text-sm text-fg-subtle">{title}</div>}
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-[--color-bg-base] rounded">
              <span className="text-fg-muted font-medium">Price:</span>
              <div className="text-right">
                {hasDiscount ? (
                  <>
                    <span className="text-sm text-fg-subtle line-through">
                      {formatPrice(originalPrice || 0, currency)}
                    </span>
                    <div className="text-lg font-medium text-red-600">
                      {formatPrice(unit_price ?? 0, currency)}
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      Save {formatPrice(discountAmount, currency)} ({discountPercentage}%
                      off)
                    </div>
                  </>
                ) : (
                  <span className="text-lg font-medium">
                    {formatPrice(unit_price ?? 0, currency)}
                  </span>
                )}
                
                {hasManualDiscount && (
                  <div className="mt-2 pt-2 border-t border-theme-border">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700">
                        Manual Discount
                      </span>
                    </div>
                    <div className="text-sm text-fg-subtle">
                      {manualDiscount?.type === "percent"
                        ? `${manualDiscount.value}% off`
                        : `${formatPrice(
                            manualDiscount?.value || 0,
                            currency
                          )} off`}
                    </div>
                    <div className="text-lg font-semibold text-orange-600 mt-1">
                      Final: {formatPrice(
                        priceAfterManualDiscount ?? 0,
                        currency
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {sku && (
              <div className="flex justify-between items-center p-3 bg-[--color-bg-base] rounded">
                <span className="text-fg-muted font-medium">SKU:</span>
                <span>{sku || "-"}</span>
              </div>
            )}

            <div className="flex justify-between items-center p-3 bg-[--color-bg-base] rounded">
              <span className="text-fg-muted font-medium">Barcode:</span>
              <span>{ean || "-"}</span>
            </div>

            {optionsDisplay && (
              <div className="flex justify-between items-center p-3 bg-[--color-bg-base] rounded">
                <span className="text-fg-muted font-medium">Options:</span>
                <span>{optionsDisplay}</span>
              </div>
            )}

            {availableQuantity !== null && (
              <div className="flex justify-between items-center p-3 bg-[--color-bg-base] rounded">
                <span className="text-fg-muted font-medium">
                  Available Quantity:
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    isOutOfStock || isLastOne
                      ? "bg-red-100 text-red-800"
                      : isFewLeft
                        ? "bg-orange-100 text-orange-800"
                        : "bg-green-100 text-green-800"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of stock"
                    : isLastOne
                      ? "Last One"
                      : isFewLeft
                        ? `Only ${availableQuantity} left`
                        : availableQuantity}
                </span>
              </div>
            )}

            {itemComment && (
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <span className="text-fg-muted font-medium block mb-2">
                  Comment:
                </span>
                <p className="text-sm text-fg-muted whitespace-pre-wrap">
                  {itemComment}
                </p>
              </div>
            )}
          </div>

          {/* Inventory Kit Items Section */}
          {isInventoryKit && (
            <div className="mt-6 border-t border-theme-border pt-4">
              <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                <Package size={16} />
                Kit Contents
                {inventoryKitItems && inventoryKitItems.length > 0 && (
                  <span className="text-sm font-normal text-fg-subtle">
                    (
                    {inventoryKitItems.reduce(
                      (total, item) => total + (item.required_quantity || 1),
                      0
                    )}{" "}
                    items)
                  </span>
                )}
              </h3>

              {isLoadingKitItems ? (
                <div className="flex items-center justify-center py-4">
                  <LoaderCircle className="animate-spin" size={24} />
                  <span className="ml-2 text-sm text-fg-muted">
                    Loading kit items...
                  </span>
                </div>
              ) : kitItemsError ? (
                <div className="p-3 bg-red-50 text-red-700 rounded text-sm">
                  Error loading kit items. Please try again.
                </div>
              ) : inventoryKitItems && inventoryKitItems.length > 0 ? (
                <div className="space-y-2">
                  {inventoryKitItems.map((kitItem, index) => {
                    return (
                      <div
                        key={`${kitItem.id}-${index}`}
                        className="flex items-center gap-3 p-3 bg-surface-muted rounded border border-theme-border"
                      >
                        <div className="text-sm font-medium text-fg-muted min-w-4">
                          {kitItem.required_quantity || 1}x
                        </div>

                        {kitItem.product?.thumbnail ? (
                          <img
                            src={kitItem.product.thumbnail}
                            alt={kitItem.product.title}
                            className="w-12 h-12 object-contain rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-surface-subtle rounded flex items-center justify-center">
                            <Image size={16} className="text-fg-subtle" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-fg truncate">
                            {kitItem.product?.title || "Unknown Product"}
                          </div>
                          <div className="text-xs text-fg-subtle truncate">
                            {kitItem.title !== kitItem.product?.title &&
                              kitItem.title}
                          </div>
                          {kitItem.sku && (
                            <div className="text-xs text-fg-subtle">
                              SKU: {kitItem.sku}
                            </div>
                          )}
                        </div>

                        {kitItem.inventory_quantity !== null &&
                          kitItem.inventory_quantity !== undefined && (
                            <div className="text-right">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  kitItem.inventory_quantity === 0
                                    ? "bg-red-100 text-red-700"
                                    : kitItem.inventory_quantity <= 5
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-green-100 text-green-700"
                                }`}
                              >
                                {kitItem.inventory_quantity === 0
                                  ? "Out of stock"
                                  : `${kitItem.inventory_quantity} in stock`}
                              </span>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-surface-muted text-fg-muted rounded text-sm text-center">
                  No kit items found
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDialog;
