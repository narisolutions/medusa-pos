import { AdminProductVariant } from "@medusajs/types";
import { CartItem, DraftOrderMetadata } from "@/types/utils";

const resolveSelectedItemId = (
  items: CartItem[],
  preferredIds: Array<string | undefined>
): string | undefined => {
  for (const candidate of preferredIds) {
    if (!candidate) continue;
    const exists = items.some((item) => item.variant_id === candidate);
    if (exists) {
      return candidate;
    }
  }

  return items.find((item) => !!item.variant_id)?.variant_id;
};

const buildItemMetadata = (variant: AdminProductVariant) => {
  const availableQuantity =
    typeof variant.inventory_quantity === "number"
      ? variant.inventory_quantity
      : undefined;
  const fallbackUnitPrice = variant.prices?.[0]?.amount ?? undefined;
  const originalPrice =
    variant.calculated_price?.original_amount ?? fallbackUnitPrice;

  const baseMetadata = {
    product_title: variant.product?.title,
    variant_sku: variant.sku,
    barcode: variant.barcode,
    ean: variant.ean,
    thumbnail: variant.product?.thumbnail,
    available_quantity: availableQuantity,
    original_price: originalPrice,
    priceListType:
      variant.calculated_price?.calculated_price?.price_list_type,
  };

  return {
    ...baseMetadata,
    ...(variant.options && variant.options.length > 0 && {
      options: variant.options,
    }),
    ...((variant.inventory_items?.length ?? 0) > 1 && {
      inventory_item_ids: variant.inventory_items!.map(
        (item) => item.inventory_item_id
      ),
    }),
  };
};

const getVariantUnitPrice = (variant: AdminProductVariant): number => {
  return variant.calculated_price?.calculated_amount ?? variant.prices?.[0]?.amount ?? 0;
};

/**
 * Whether the till can charge for the variant. The POS catalogue asks Medusa for the price in the
 * till's currency (`calculated_price`), and none there means none: ₾0 must never stand in for it.
 * The plain admin catalogue carries no `calculated_price`, so there any listed price counts.
 */
const variantHasPrice = (variant: Pick<AdminProductVariant, "calculated_price" | "prices">): boolean => {
  if (variant.calculated_price !== undefined) {
    return typeof variant.calculated_price?.calculated_amount === "number";
  }
  return (variant.prices?.length ?? 0) > 0;
};

const getVariantAvailableQuantity = (
  variant: AdminProductVariant
): number | undefined => {
  return typeof variant.inventory_quantity === "number"
    ? variant.inventory_quantity
    : undefined;
};

const DEFAULT_CART_METADATA: DraftOrderMetadata = {
  payment_method: undefined,
  order_comment: "",
};

export {
  resolveSelectedItemId,
  buildItemMetadata,
  DEFAULT_CART_METADATA,
  getVariantUnitPrice,
  getVariantAvailableQuantity,
  variantHasPrice,
};

