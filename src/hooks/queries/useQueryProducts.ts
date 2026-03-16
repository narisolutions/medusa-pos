import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminProduct } from "@medusajs/types";
import { loadPreferences } from "@/utils/preferences";

const MEDUSA_PRODUCT_FIELDS = [
  "*variants",
  "*variants.prices",
  "*variants.options",
  "*variants.options.option",
  "*variants.images",
  "*variants.inventory_items",
  "*variants.inventory_items.inventory",
  // "*variants.translations",
  // "*translations",
  "*images",
  "*categories",
  "*categories.parent_category",
  "*tags",
  "*options",
  "*options.values",
  "+variants.inventory_quantity",
  "status",
].join(",");

const fetchProducts = async (
  salesChannelId: string
): Promise<AdminProduct[]> => {
  if (!salesChannelId) {
    return [];
  }

  const prefs = await loadPreferences();

  if (prefs.integration.customEndpointsEnabled) {
    try {
      const sdk = getSdk();
      const products = await sdk.client.fetch<AdminProduct[]>(
        `/pos/products/${salesChannelId}`
      );
      return products;
    } catch (error) {
      handleErrorToast(error, { posEndpointError: true });
      return [];
    }
  }

  try {
    const sdk = getSdk();
    const { products } = await sdk.admin.product.list({
      sales_channel_id: [salesChannelId],
      fields: MEDUSA_PRODUCT_FIELDS,
    });
    return products.filter((p) => p.status === "published");
  } catch (error) {
    handleErrorToast(error);
    return [];
  }
};

const useQueryProducts = (
  salesChannelId?: string
): UseQueryResult<AdminProduct[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminProduct[], Error>({
    queryKey: ["products", salesChannelId],
    queryFn: () => fetchProducts(salesChannelId!),
    enabled: isAuthenticated && !!salesChannelId,
  });
};

export { useQueryProducts, fetchProducts };
