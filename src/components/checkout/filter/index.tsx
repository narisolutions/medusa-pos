import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { X, Loader2 } from "lucide-react";
import { useCheckoutFilter } from "./hooks";
import { AdminProduct } from "@medusajs/types";
import { formatPrice } from "@/utils/helpers";
import { ExtendedAdminProduct } from "@/types/utils";
import ItemDialog from "../cart-items/variant-dialog";
import { useCheckout } from "../hooks";
import { getVariantAvailableQuantity, getVariantUnitPrice } from "@/utils/cart";
import { useCustomEndpoints } from "@/hooks/ui/useCustomEndpoints";

interface Props {
  products: AdminProduct[];
}

const CheckoutFilter: React.FC<Props> = ({ products }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogClickedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    inputValue,
    mode,
    handleInputChange,
    handleKeyDown,
    isProcessing,
    handleClear,
    handleBarcodeSubmit,
    showClearButton,
    isButtonEnabled,
    handleMouseDown,
    getInputPlaceholder,
    handleAddToCart,
    filteredVariants,
    showDropdown,
    updateFilterState,
    getBrandTitle,
  } = useCheckoutFilter({ products, inputRef });

  const { currency } = useCheckout();
  const { customEndpointsEnabled } = useCustomEndpoints();

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest('[role="dialog"]') ||
        target.closest('[data-radix-dialog-overlay]') ||
        target.getAttribute('data-dialog-trigger') === 'true') {
        return;
      }

      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }

      updateFilterState({ showDropdown: false });
      dialogClickedRef.current = false;
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, updateFilterState]);

  return (
    <div className="flex flex-col gap-2">
      {!customEndpointsEnabled && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Custom product endpoints are disabled: stock is not checked automatically when
          adding items to cart, and prices are raw (not context-calculated). Verify stock
          and price manually.
        </div>
      )}
      <div className="flex justify-center items-center gap-6 border border-theme-border bg-surface p-6 rounded-lg">
        <div ref={dropdownRef} className="relative flex-1 w-full">
          <Command className="rounded-lg border border-theme-border bg-(--color-bg-base)">
          <div className="relative">
            <CommandInput
              ref={inputRef}
              placeholder={getInputPlaceholder()}
              value={inputValue}
              onValueChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              onFocus={() => updateFilterState({ showDropdown: true })}
              className="h-14 text-lg px-2 text-primary border-secondary "
            />
            {showClearButton && (
              <Button
                variant="ghost"
                size="lg"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-surface-hover z-10"
                onClick={handleClear}
                onMouseDown={handleMouseDown}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {showDropdown && mode === "search" && filteredVariants.length > 0 && (
            <CommandList className="absolute top-full left-0 right-0 z-50 max-h-125 overflow-y-auto border border-theme-border bg-surface rounded-lg shadow-lg mt-2">
              <CommandEmpty className="py-6 text-lg">
                No products found.
              </CommandEmpty>
              <CommandGroup>
                {filteredVariants.map((variant) => {
                  const { id, title, sku, ean, product } = variant;

                  const calculatedPrice = getVariantUnitPrice(variant);
                  const originalPrice =
                    variant.calculated_price?.original_amount ?? calculatedPrice;
                  const brandTitle = getBrandTitle(
                    product as ExtendedAdminProduct
                  );
                  const isSale =
                    variant?.calculated_price?.calculated_price
                      ?.price_list_type === "sale";

                  const availableQuantity = getVariantAvailableQuantity(variant);
                  const isOutOfStock = availableQuantity === 0;
                  const isLastOne = availableQuantity === 1;
                  const isFewLeft =
                    typeof availableQuantity === "number" &&
                    availableQuantity > 0 &&
                    availableQuantity <= 5;
                  const variantTitle =
                    title === "Default variant" ? product?.title : title || "-";

                  const options = variant.options as
                    | Array<{ value: string; option: { title: string } }>
                    | undefined;
                  const optionsDisplay = options && options.length > 0
                    ? options.map((opt) => opt.value).join("/")
                    : null;

                  return (
                    <CommandItem
                      key={id}
                      value={`${variant.product?.title} ${title} ${sku || ""} ${ean || ""} ${brandTitle || ""}`}
                      onSelect={() => {
                        if (dialogClickedRef.current) {
                          dialogClickedRef.current = false;
                          return;
                        }
                        handleAddToCart(variant);
                      }}
                      className={`flex items-center justify-between p-5  min-h-[80px] border-b border-theme-border last:border-b-0 ${isOutOfStock ? "opacity-50 bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500 cursor-not-allowed" : "cursor-pointer hover:bg-(--color-bg-base)"}`}
                    >
                      <div className="flex gap-1 flex-1">
                        <div className="flex-1 pr-4">
                          <div className="font-medium text-base mb-1">
                            {variant.product?.title}
                            {brandTitle && (
                              <span className="text-sm text-fg-subtle ml-2 font-normal">
                                by {brandTitle}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-fg-muted mb-1">
                            {variantTitle}
                            {optionsDisplay && (
                              <span className="ml-2">• {optionsDisplay}</span>
                            )}
                            {sku && (
                              <span className="ml-2">• SKU: {sku}</span>
                            )}
                          </div>
                          {ean && (
                            <div className="text-sm text-fg-subtle">
                              Barcode: {ean}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(isOutOfStock || isLastOne || isFewLeft) && (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${isOutOfStock || isLastOne
                                  ? "bg-red-100 text-red-800"
                                  : isFewLeft
                                    ? "bg-orange-100 text-orange-800"
                                    : ""
                                }`}
                            >
                              {isOutOfStock
                                ? "Out of stock"
                                : isLastOne
                                  ? "Last One"
                                  : isFewLeft
                                    ? `Only ${availableQuantity} left`
                                    : null}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <div
                          className="min-w-[32px] flex justify-center"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <ItemDialog
                            item={variant}
                            onDialogClick={() => {
                              dialogClickedRef.current = true;
                            }}
                            onDialogClose={() => {
                              dialogClickedRef.current = false;
                            }}
                          />
                        </div>
                        <div className="flex flex-col items-end gap-1 min-w-[80px]">
                          {isSale &&
                            originalPrice &&
                            calculatedPrice &&
                            originalPrice !== calculatedPrice ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-fg-subtle line-through">
                                  {formatPrice(originalPrice, currency)}
                                </span>
                              </div>
                              <span className="font-medium text-base text-red-600">
                                {formatPrice(calculatedPrice, currency)}
                              </span>
                            </>
                          ) : (
                            <span className="font-medium text-base text-fg">
                              {formatPrice(calculatedPrice, currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          )}
          </Command>
        </div>
        <Button
          onClick={() => {
            handleBarcodeSubmit(inputValue);
          }}
          onMouseDown={handleMouseDown}
          disabled={!isButtonEnabled || isProcessing}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-white h-14 px-8 text-lg font-medium"
        >
          {isProcessing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "Add Item"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutFilter;
