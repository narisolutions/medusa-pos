import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { useUser } from "@/context/user";
import { InventoryKitVariant, KitInventoryItem } from "@/types/utils";
import {
  KIT_ITEM_FIELDS,
  mapKitComponents,
  type InventoryItemWithVariants,
} from "@/utils/pos/inventory-kit";

// Asks the kit's own inventory items for their variants: one small request, instead of
// scanning a page of the catalogue and missing every product past it.
const fetchInventoryKitItems = async (
  inventoryItemIds: string[],
  kitVariantInventoryItems?: KitInventoryItem[]
): Promise<InventoryKitVariant[]> => {
  if (inventoryItemIds.length === 0) return [];

  const { inventory_items } = await getSdk().admin.inventoryItem.list({
    id: inventoryItemIds,
    fields: KIT_ITEM_FIELDS,
    limit: inventoryItemIds.length,
  });

  return mapKitComponents(
    inventory_items as unknown as InventoryItemWithVariants[],
    kitVariantInventoryItems
  );
};

const useQueryInventoryKitItems = (
  inventoryItemIds?: string[],
  kitVariantInventoryItems?: KitInventoryItem[]
): UseQueryResult<InventoryKitVariant[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<InventoryKitVariant[], Error>({
    queryKey: queryKeys.inventoryKitItems(inventoryItemIds, kitVariantInventoryItems),
    queryFn: () => fetchInventoryKitItems(inventoryItemIds!, kitVariantInventoryItems),
    enabled: isAuthenticated && !!inventoryItemIds && inventoryItemIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export { useQueryInventoryKitItems };
