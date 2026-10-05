import type { InventoryKitVariant, KitInventoryItem } from "@/types/utils";

/** An inventory item with the variants linked to it — Medusa's `variants` link alias. */
type InventoryItemWithVariants = {
  id: string;
  stocked_quantity?: number | null;
  reserved_quantity?: number | null;
  variants?: Array<{
    id: string;
    title?: string | null;
    sku?: string | null;
    ean?: string | null;
    product?: { id: string; title?: string | null; thumbnail?: string | null } | null;
  }> | null;
};

const KIT_ITEM_FIELDS = [
  "id",
  "stocked_quantity",
  "reserved_quantity",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.ean",
  "variants.product.id",
  "variants.product.title",
  "variants.product.thumbnail",
].join(",");

/**
 * The variants that make up a kit, one row each, with the stock of the inventory item
 * they draw from and how many of it one kit takes.
 */
const mapKitComponents = (
  items: InventoryItemWithVariants[],
  kitInventoryItems?: KitInventoryItem[]
): InventoryKitVariant[] => {
  const seen = new Set<string>();
  const components: InventoryKitVariant[] = [];

  for (const item of items) {
    const link = kitInventoryItems?.find(
      (kitItem) => (kitItem.inventory_item_id || kitItem.id) === item.id
    );
    const available = Math.max(0, (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0));

    for (const variant of item.variants ?? []) {
      if (seen.has(variant.id)) continue;
      seen.add(variant.id);
      const productTitle = variant.product?.title ?? "";
      components.push({
        id: variant.id,
        title:
          !variant.title || variant.title === "Default variant"
            ? productTitle || "Default variant"
            : variant.title,
        sku: variant.sku || undefined,
        ean: variant.ean || undefined,
        inventory_quantity: available,
        required_quantity: link?.required_quantity || 1,
        product: variant.product
          ? {
              id: variant.product.id,
              title: productTitle,
              thumbnail: variant.product.thumbnail || undefined,
            }
          : undefined,
      });
    }
  }

  return components;
};

export { mapKitComponents, KIT_ITEM_FIELDS };
export type { InventoryItemWithVariants };
