import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/state-panel";
import React, { useEffect, useRef } from "react";
import Backdrop from "@/components/base/backdrop";
import { formatPrice } from "@/utils/helpers";
import ItemDialog from "@/components/base/product-picker/variant-dialog";
import { useCartItems } from "./hooks";
import { useCheckout } from "../hooks";
import { useCartStore } from "@/context/cart";
import { useTranslation } from "@/i18n";

interface Props {
  /** The line a scan or catalog tap just added or bumped; `seq` replays the flash for a repeat. */
  lastAdded: { id: string; seq: number } | null;
}

const CartItems: React.FC<Props> = ({ lastAdded }) => {
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

  const { currency } = useCheckout();
  const { t } = useTranslation();

  const subtotal = useCartStore((state) => state.getSubtotal());
  const discountAmount = useCartStore((state) => state.getDiscountAmount());
  const totalAfterDiscount = useCartStore((state) =>
    state.getTotalAfterDiscount()
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lastAdded) return;
    scrollRef.current
      ?.querySelector(`[data-variant-id="${CSS.escape(lastAdded.id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [lastAdded]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedItemId(undefined);
    }
  };

  return (
    <div className="flex flex-col flex-1 border border-theme-border bg-surface rounded-lg overflow-hidden h-full">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* A narrow cart (Large display size, a small screen) drops SKU and Options, which the
            item's details still show, so the quantity buttons keep their room. */}
        <div ref={scrollRef} className="@container flex-1 overflow-auto" onClick={handleContainerClick}>
          <Table className="table-fixed w-full">
            <TableHeader className="sticky top-0 bg-primary text-white [&_th]:px-7 z-10">
              <TableRow className="h-13">
                <TableHead className="text-white w-[28%]">{t("checkout.column_item")}</TableHead>
                <TableHead className="text-white w-[10%] hidden @4xl:table-cell">{t("checkout.column_sku")}</TableHead>
                <TableHead className="text-white w-[12%] hidden @4xl:table-cell">{t("checkout.column_options")}</TableHead>
                <TableHead className="text-white text-center w-[22%]">
                  {t("checkout.column_quantity")}
                </TableHead>
                <TableHead className="text-white text-right w-[16%]">
                  {t("checkout.column_price")}
                </TableHead>
                <TableHead className="text-white w-[12%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td]:px-7 [&_td]:py-6">
              {items.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={6} className="w-full">
                    <EmptyState
                      className="pt-65"
                      icon={<ShoppingCart />}
                      title={t("checkout.no_items_title")}
                      hint={t("checkout.no_items_description")}
                    />
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
                  const flashSeq = lastAdded && lastAdded.id === variant_id ? lastAdded.seq : null;

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
                      // A new key remounts the row, restarting the flash on a repeat scan.
                      key={flashSeq === null ? variant_id : `${variant_id}-${flashSeq}`}
                      data-variant-id={variant_id}
                      aria-selected={isSelected}
                      className={`h-13 cursor-pointer transition-colors ${flashSeq === null ? "" : "animate-cart-flash"}
                        ${isOutOfStock ? "bg-danger-subtle border-l-4 border-l-danger" : ""}
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
                          <ItemDialog item={item} currency={currency} />
                          <div className="font-medium text-base min-w-0 flex-1">
                            <div className="truncate" title={title || "-"}>
                              {title || "-"}
                            </div>
                            {isOutOfStock && (
                              <StatusChip intent="danger" className="mt-1">
                                {t("checkout.out_of_stock")}
                              </StatusChip>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden @4xl:table-cell">
                        <div className="text-base text-fg">{String(sku || "-")}</div>
                      </TableCell>
                      <TableCell className="hidden @4xl:table-cell">
                        <div className="text-base text-fg">
                          {options && options.length > 0
                            ? options.map((opt) => opt.value).join("/")
                            : "-"}
                        </div>
                      </TableCell>
                      <TableCell className="px-2!">
                        {/* Keeps focus in the scan field while the operator steps the quantity. */}
                        <div
                          className="flex justify-center"
                          title={isLastOne ? t("checkout.last_one") : undefined}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <Stepper
                            value={quantity}
                            min={1}
                            max={typeof metadata?.available_quantity === "number" ? metadata.available_quantity : undefined}
                            onChange={(next) =>
                              handleQuantityChange(variant_id!, next - quantity)
                            }
                            disabled={loading || isOutOfStock}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-base">
                        <div className="flex flex-col items-end gap-1">
                          {hasManualDiscount ? (
                            <>
                              <span className="text-base text-fg-muted line-through">
                                {formatPrice(originalTotal, currency)}
                              </span>
                              <div className="text-warning-text font-semibold">
                                {formatPrice(itemTotal, currency)}
                              </div>
                            </>
                          ) : (
                            <span>{formatPrice(itemTotal, currency)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-2! text-center">
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          onClick={(e) =>
                            handleButtonClick(e, () =>
                              handleRemoveItem(variant_id!)
                            )
                          }
                          onMouseDown={handleMouseDown}
                          disabled={loading}
                          title={t("common.remove")}
                          aria-label={t("common.remove")}
                        >
                          <Trash2 className="size-6 text-danger-text" />
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
        <div className="p-4 border-t border-theme-border space-y-2">
          <div className="flex justify-between text-base text-fg-muted">
            <span>{t("checkout.subtotal_label")}</span>
            <span className="tabular-nums">{formatPrice(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-base text-success-text">
              <span>{t("checkout.discount_label")}</span>
              <span className="tabular-nums">-{formatPrice(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-xl font-medium">{t("checkout.total_label")}</span>
            <span className="text-total font-bold tabular-nums text-primary">
              {formatPrice(totalAfterDiscount, currency)}
            </span>
          </div>
        </div>
      )}

      <Backdrop loading={loading} />
    </div>
  );
};

export default CartItems;
