import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminOrder } from "@medusajs/types";
import { useFulfillmentDialog } from "./hooks";
import { Package, Plus, Minus, MapPin, Truck } from "lucide-react";
import { formatPrice } from "@/utils/helpers";

interface FulfillmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdminOrder;
}

const FulfillmentDialog: React.FC<FulfillmentDialogProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const {
    isProcessing,
    selectedItems,
    updateItemQuantity,
    hasSelectedItems,
    handleCreateFulfillment,
    handleClose,
    handleDialogChange,
    stockLocationsQuery,
    totalItemsToFulfill,
    preferredLocationName,
  } = useFulfillmentDialog(order, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden"
        preventOutsideClose={isProcessing}
      >
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-600" />
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Pack Order Items
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Add items to package as you pack them. Start from 0 and increase quantity for each item added.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Stock Location
                    </p>
                    {stockLocationsQuery.isLoading ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : preferredLocationName ? (
                      <p className="text-sm font-medium text-gray-900">
                        {preferredLocationName}
                      </p>
                    ) : (
                      <p className="text-sm text-primary font-medium">
                        Not configured – set a default in Preferences
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <Truck className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Shipping Option
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {order.shipping_methods?.[0]?.name || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm font-semibold text-gray-700 mb-4">                                                                                                                                                  
              Items to fulfill ({totalItemsToFulfill} items)
            </div>

            {order.items?.map((orderItem) => {
              const fulfillmentItem = selectedItems.find(                                                                               
                (item) => item.id === orderItem.id
              );

              if (!fulfillmentItem) return null;

              // Access metadata from public or private
              const publicMetadata = (orderItem.metadata?.public as Record<string, unknown>) || {};
              const privateMetadata = (orderItem.metadata?.private as Record<string, unknown>) || {};
              const metadata = { ...publicMetadata, ...privateMetadata };
              
              // Get fields from orderItem directly or from variant
              const vintage = metadata.vintage ? String(metadata.vintage) : null;
              const volume = metadata.volume ? String(metadata.volume) : null;
              const sku = orderItem.variant_sku || orderItem.variant?.sku || null;
              const gtin = orderItem.variant?.ean || orderItem.variant?.barcode || null;
              const thumbnail = orderItem.thumbnail || null;
              const productTitle = orderItem.product_title || null;
              const subtitle = orderItem.subtitle || orderItem.variant_title || null;

              return (
                <div
                  key={orderItem.id}
                  className="bg-white rounded-lg p-4 border-2 border-gray-200"
                >
                  <div className="flex gap-4 mb-4">
                    {thumbnail && (
                      <div className="shrink-0">
                        <img
                          src={thumbnail}
                          alt={orderItem.variant_title || "Product"}
                          className="w-10 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 text-base">
                        {orderItem.title || orderItem.variant_title}
                      </h3>
                      {subtitle && (
                        <p className="text-sm text-gray-600 mb-1">{subtitle}</p>
                      )}
                      {productTitle && productTitle !== orderItem.title && productTitle !== orderItem.variant_title && (
                        <p className="text-sm text-gray-500 mb-2">{productTitle}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {sku && (
                          <div>
                            <span className="text-gray-500">SKU:</span>{" "}
                            <span className="font-medium text-gray-900">{sku}</span>
                          </div>
                        )}
                        {gtin && (
                          <div>
                            <span className="text-gray-500">GTIN:</span>{" "}
                            <span className="font-medium text-gray-900">{gtin}</span>
                          </div>
                        )}
                        {vintage && (
                          <div>
                            <span className="text-gray-500">Vintage:</span>{" "}
                            <span className="font-medium text-gray-900">{vintage}</span>
                          </div>
                        )}
                        {volume && (
                          <div>
                            <span className="text-gray-500">Volume:</span>{" "}
                            <span className="font-medium text-gray-900">{volume}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Unit Price:</span>{" "}
                          <span className="font-medium text-gray-900">
                            {formatPrice(orderItem.unit_price || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-500">Required:</span>{" "}
                        <span className="font-medium text-blue-600">
                          {fulfillmentItem.maxQuantity} qty.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-700 min-w-[100px]">
                      Packed Quantity:
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateItemQuantity(
                            orderItem.id,
                            fulfillmentItem.quantity - 1
                          )
                        }
                        disabled={
                          fulfillmentItem.quantity <= 0 || isProcessing
                        }
                        className="h-9 w-9 p-0 border-2"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={fulfillmentItem.quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          updateItemQuantity(orderItem.id, value);
                        }}
                        min={0}
                        max={fulfillmentItem.maxQuantity}
                        disabled={isProcessing}
                        className="w-24 text-center text-base font-semibold border-2"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateItemQuantity(
                            orderItem.id,
                            fulfillmentItem.quantity + 1
                          )
                        }
                        disabled={
                          fulfillmentItem.quantity >=
                            fulfillmentItem.maxQuantity || isProcessing
                        }
                        className="h-9 w-9 p-0 border-2"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {fulfillmentItem.quantity === fulfillmentItem.maxQuantity ? (
                        <span className="text-sm font-medium text-green-600">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {fulfillmentItem.maxQuantity - fulfillmentItem.quantity} remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50 shrink-0">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFulfillment}
              disabled={!hasSelectedItems || isProcessing}
              className="bg-primary hover:bg-primary/90 text-white px-6"
            >
              {isProcessing ? "Creating..." : "Create Fulfillment"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FulfillmentDialog;

