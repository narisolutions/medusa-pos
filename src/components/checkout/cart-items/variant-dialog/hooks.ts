import { CartItem } from "@/types/utils";
import { AdminProductVariant, AdminProduct } from "@medusajs/types";
import { useQueryInventoryKitItems } from "@/hooks/queries/useQueryInventoryKitItems";
import { getVariantAvailableQuantity, getVariantUnitPrice } from "@/utils/cart";

// Transform AdminProductVariant to standardized format
const transformVariantToItem = (
  variant: AdminProductVariant & { product: AdminProduct }
) => {
  return {
    title:
      variant.title === "Default variant"
        ? variant.product?.title
        : variant.title || "-",
    unit_price: getVariantUnitPrice(variant),
    metadata: {
      product_title: variant.product?.title,
      variant_sku: variant.sku,
      barcode: variant.ean,
      thumbnail: variant.product?.thumbnail,
      available_quantity: getVariantAvailableQuantity(variant),
      original_price:
        variant.calculated_price?.original_amount ?? getVariantUnitPrice(variant),
      priceListType:
        variant?.calculated_price?.calculated_price?.price_list_type,
      ...(variant.options && variant.options.length > 0 && { options: variant.options }),
    },
  };
};

const useItemDialog = (
  item: CartItem | (AdminProductVariant & { product: AdminProduct }),
  isDialogOpen?: boolean // Add parameter to control when to fetch kit items
) => {
  const isCartItem = "variant_id" in item;
  const normalizedItem = isCartItem
    ? item
    : transformVariantToItem(
        item as AdminProductVariant & { product: AdminProduct }
      );

  const { title, unit_price, metadata } = normalizedItem;

  // Get the current variant ID to exclude it from kit items
  const currentVariantId = isCartItem
    ? item.variant_id
    : (item as AdminProductVariant).id;

  const {
    product_title,
    variant_sku,
    barcode,
    thumbnail,
    original_price,
    priceListType,
    available_quantity,
    options,
  } = metadata || {};

  const inventory_item_ids =
    metadata && "inventory_item_ids" in metadata
      ? (metadata.inventory_item_ids as string[])
      : undefined;

  // Get full inventory items with required_quantity if available
  const kitInventoryItems = !isCartItem
    ? (item as AdminProductVariant).inventory_items
    : undefined;


  const isInventoryKit =
    inventory_item_ids &&
    Array.isArray(inventory_item_ids) &&
    inventory_item_ids.length > 0;

  const {
    data: allKitItems = [],
    isLoading: isLoadingKitItems,
    error: kitItemsError,
  } = useQueryInventoryKitItems(
    isInventoryKit && isDialogOpen ? inventory_item_ids : undefined, // Only fetch when dialog is open
    kitInventoryItems || undefined // Pass the full inventory items with required_quantity
  );

  const inventoryKitItems = allKitItems.filter(
    (kitItem) => kitItem.id !== currentVariantId
  );

  // Convert to safe values
  const productTitle = String(product_title || "");
  const sku = String(variant_sku || "");
  const ean = String(barcode || "");
  const originalPrice =
    typeof original_price === "number" ? original_price : null;
  const availableQuantityValue =
    typeof available_quantity === "number" ? available_quantity : null;
  
  // Get options from metadata (for cart items) or from variant (for filter items)
  const optionsArray = isCartItem
    ? (options as Array<{ value: string; option: { title: string } }> | undefined)
    : (item as AdminProductVariant).options;
  
  const optionsDisplay = optionsArray && optionsArray.length > 0
    ? optionsArray.map((opt) => `${opt.option?.title || "Option"}: ${opt.value}`).join(", ")
    : null;

  // Calculate discount information
  const isSale = priceListType === "sale";
  const hasDiscount =
    isSale && originalPrice && unit_price && originalPrice !== unit_price;
  const discountAmount =
    hasDiscount && originalPrice && unit_price ? originalPrice - unit_price : 0;
  const discountPercentage =
    hasDiscount && originalPrice && originalPrice > 0
      ? Math.round((discountAmount / originalPrice) * 100)
      : 0;

  // Manual discount information (only for cart items)
  const itemMetadata = isCartItem ? (item as CartItem).metadata : null;
  const manualDiscount = itemMetadata
    ? (itemMetadata.item_discount as
        | { type: "amount" | "percent"; value: number }
        | null
        | undefined)
    : null;

  const hasManualDiscount = manualDiscount && manualDiscount.value > 0;

  // Use original price as base for manual discount calculation, fallback to unit_price if no original price
  const basePriceForManualDiscount = originalPrice || unit_price || 0;

  let manualDiscountAmount = 0;
  if (hasManualDiscount && basePriceForManualDiscount) {
    if (manualDiscount.type === "percent") {
      manualDiscountAmount = (basePriceForManualDiscount * manualDiscount.value) / 100;
    } else {
      manualDiscountAmount = manualDiscount.value;
    }
  }

  const priceAfterManualDiscount =
    basePriceForManualDiscount && hasManualDiscount
      ? basePriceForManualDiscount - manualDiscountAmount
      : unit_price;

  // Calculate stock status
  const isOutOfStock = availableQuantityValue === 0;
  const isLastOne = availableQuantityValue === 1;
  const isFewLeft =
    availableQuantityValue !== null &&
    availableQuantityValue > 0 &&
    availableQuantityValue <= 5;

  return {
    isCartItem,
    title,
    unit_price,
    productTitle,
    sku,
    ean,
    thumbnail,
    originalPrice,
    optionsDisplay,
    availableQuantity: availableQuantityValue,
    isSale,
    hasDiscount,
    discountAmount,
    discountPercentage,
    hasManualDiscount,
    manualDiscount,
    manualDiscountAmount,
    priceAfterManualDiscount,
    isOutOfStock,
    isLastOne,
    isFewLeft,
    isInventoryKit,
    inventoryKitItems,
    isLoadingKitItems,
    kitItemsError,
  };
};

export { useItemDialog };
