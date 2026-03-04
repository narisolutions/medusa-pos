import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import React from "react";
import Backdrop from "@/components/base/backdrop";
import { formatPrice } from "@/utils/helpers";
import ItemDialog from "./variant-dialog";
import { useCartItems } from "./hooks";
import { useCartStore } from "@/context/cart";

const CartItems: React.FC = () => {
  const {
    items,
    loading,
    handleQuantityChange,
    handleRemoveItem,
    handleMouseDown,
    handleButtonClick,
    selectedItemId,
    setSelectedItemId,
  } = useCartItems();

  const subtotal = useCartStore((state) => state.getSubtotal());
  const discountAmount = useCartStore((state) => state.getDiscountAmount());
  const totalAfterDiscount = useCartStore((state) =>
    state.getTotalAfterDiscount()
  );

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedItemId(undefined);
    }
  };

  return (
    <div className="flex flex-col flex-1 border border-zinc-200 bg-white rounded-lg overflow-hidden h-full">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto" onClick={handleContainerClick}>
          <Table className="table-fixed w-full">
            <TableHeader className="sticky top-0 bg-primary text-white [&_th]:px-7 z-10">
              <TableRow className="h-13">
                <TableHead className="text-white w-[30%]">Item</TableHead>
                <TableHead className="text-white w-[10%]">SKU</TableHead>
                <TableHead className="text-white w-[15%]">Options</TableHead>
                <TableHead className="text-white text-center w-[15%]">
                  Quantity
                </TableHead>
                <TableHead className="text-white text-right w-[15%]">
                  Price
                </TableHead>
                <TableHead className="text-white w-[10%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td]:px-7 [&_td]:py-6">
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="w-full">
                    <div className="flex flex-col items-center gap-2 pt-65 justify-center w-full">
                      <ShoppingCart />
                      <h3 className="text-lg font-medium">No items scanned</h3>
                      <p className="text-sm">
                        Start scanning items to add them to the checkout
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const { title, unit_price, quantity, variant_id, metadata } =
                    item;
                  const sku = metadata?.variant_sku;
                  const options = metadata?.options as
                    | Array<{ value: string; option: { title: string } }>
                    | undefined;
                  const isOutOfStock = metadata?.available_quantity === 0;
                  const isLastOne = metadata?.available_quantity === 1;
                  const isSelected = selectedItemId === variant_id;

                  const originalUnitPrice = metadata?.original_unit_price as
                    | number
                    | undefined;
                  const hasManualDiscount = !!originalUnitPrice;
                  const itemTotal = (unit_price ?? 0) * quantity;
                  const originalTotal = originalUnitPrice
                    ? originalUnitPrice * quantity
                    : itemTotal;

                  return (
                    <TableRow
                      key={item.variant_id}
                      aria-selected={isSelected}
                      className={`h-13 cursor-pointer transition-colors
                        ${isOutOfStock ? "opacity-50 bg-red-50 border-l-4 border-l-red-500" : ""}
                        ${!isOutOfStock && isSelected ? "bg-primary/5 border-l-4 border-l-primary" : ""}
                        ${isSelected ? "ring-1 ring-primary/40" : ""}
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(variant_id);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <ItemDialog item={item} />
                          <div className="font-medium text-base min-w-0 flex-1">
                            <div className="truncate" title={title || "-"}>
                              {title || "-"}
                            </div>
                            {isOutOfStock && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                Out of stock
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-base ">{String(sku || "-")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-base">
                          {options && options.length > 0
                            ? options.map((opt) => opt.value).join("/")
                            : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() =>
                              handleQuantityChange(variant_id!, -1)
                            }
                            onMouseDown={handleMouseDown}
                            disabled={
                              item.quantity <= 1 || loading || isOutOfStock
                            }
                          >
                            <Minus />
                          </Button>
                          <span
                            className={`w-8 text-base text-center ${isOutOfStock ? "text-gray-400" : ""}`}
                          >
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-8 h-8 p-0"
                            title={
                              isOutOfStock
                                ? "Out of stock"
                                : isLastOne
                                  ? "Only one left in stock"
                                  : ""
                            }
                            onClick={() => handleQuantityChange(variant_id!, 1)}
                            onMouseDown={handleMouseDown}
                            disabled={loading || isOutOfStock}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-base">
                        <div className="flex flex-col items-end gap-1">
                          {hasManualDiscount ? (
                            <>
                              <span className="text-sm text-gray-400 line-through">
                                {formatPrice(originalTotal)}
                              </span>
                              <div className="text-orange-600 font-semibold">
                                {formatPrice(itemTotal)}
                              </div>
                            </>
                          ) : (
                            <span>{formatPrice(itemTotal)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-8 h-8 p-0 text-destructive hover:text-destructive ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={(e) =>
                            handleButtonClick(e, () =>
                              handleRemoveItem(variant_id!)
                            )
                          }
                          onMouseDown={handleMouseDown}
                          disabled={loading}
                          title={
                            isOutOfStock ? "Item out of stock" : "Remove item"
                          }
                        >
                          <Trash2 className="text-red-600 size-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {items.length > 0 && (
        <div className="p-4 border-t border-zinc-200 space-y-2">
          <div className="flex justify-between text-base text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-base text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-xl font-medium">Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(totalAfterDiscount)}
            </span>
          </div>
        </div>
      )}

      <Backdrop loading={loading} />
    </div>
  );
};

export default CartItems;
