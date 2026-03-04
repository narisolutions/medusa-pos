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

  const baseMetadata = {
    product_title: variant.product?.title,
    variant_sku: variant.sku,
    barcode: variant.ean,
    thumbnail: variant.product?.thumbnail,
    available_quantity: variant.inventory_quantity,
    original_price: variant.calculated_price?.original_amount,
    priceListType:
      variant.calculated_price?.calculated_price?.price_list_type,
  };

  return {
    ...baseMetadata,
    ...(variant.options && variant.options.length > 0 && { options: variant.options }),
    ...((variant.inventory_items?.length ?? 0) > 1 && {
      inventory_item_ids: variant.inventory_items!.map(
        (item) => item.inventory_item_id
      ),
    }),
  };
};

const DEFAULT_CART_METADATA: DraftOrderMetadata = {
  payment_method: undefined,
  order_discount: null,
  order_comment: "",
};

export { resolveSelectedItemId, buildItemMetadata, DEFAULT_CART_METADATA };