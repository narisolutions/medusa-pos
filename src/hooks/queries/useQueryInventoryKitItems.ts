import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { InventoryKitVariant, KitInventoryItem } from "@/types/utils";

const fetchInventoryKitItems = async (
  inventoryItemIds: string[],
  kitVariantInventoryItems?: KitInventoryItem[]
): Promise<InventoryKitVariant[]> => {
  if (!inventoryItemIds || inventoryItemIds.length === 0) {
    return [];
  }

  try {
    const sdk = getSdk();
    const { products } = await sdk.admin.product.list({
      fields:
        "*variants.inventory_items, *variants.calculated_price, variants.inventory_quantity",
    });

    const variants: InventoryKitVariant[] = [];

    (products as AdminProduct[]).forEach((product) => {
      if (product.variants) {
        (product.variants as AdminProductVariant[]).forEach((variant) => {
          if (
            variant.inventory_items &&
            variant.inventory_items.some((item) =>
              inventoryItemIds.includes(
                item.inventory_item_id || item.id || ""
              )
            )
          ) {
            const matchingKitItem = kitVariantInventoryItems?.find(
              (kitItem) =>
                variant.inventory_items?.some(
                  (variantItem) =>
                    (variantItem.inventory_item_id || variantItem.id) ===
                    (kitItem.inventory_item_id || kitItem.id)
                )
            );

            variants.push({
              id: variant.id,
              title:
                variant.title === "Default variant"
                  ? product.title
                  : variant.title || "Default variant",
              sku: variant.sku || undefined,
              ean: variant.ean || undefined,
              inventory_quantity: variant.inventory_quantity ?? undefined,
              required_quantity: matchingKitItem?.required_quantity || 1,
              product: {
                id: product.id,
                title: product.title,
                thumbnail: product.thumbnail || undefined,
              },
            });
          }
        });
      }
    });

    return variants;
  } catch (error) {
    handleErrorToast(error);
    return [];
  }
};

const useQueryInventoryKitItems = (
  inventoryItemIds?: string[],
  kitVariantInventoryItems?: KitInventoryItem[]
): UseQueryResult<InventoryKitVariant[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<InventoryKitVariant[], Error>({
    queryKey: [
      "inventory-kit-items",
      inventoryItemIds,
      kitVariantInventoryItems,
    ],
    queryFn: () =>
      fetchInventoryKitItems(inventoryItemIds!, kitVariantInventoryItems),
    enabled:
      isAuthenticated && !!inventoryItemIds && inventoryItemIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export { useQueryInventoryKitItems, fetchInventoryKitItems };
