import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminProduct } from "@medusajs/types";
import { isPosPluginInstalled } from "@/utils/pos/plugin";
import { logger } from "@/utils/logger";

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

const PRODUCT_PAGE_SIZE = 100;
// Ceiling so a bad `count` can't spin forever; ~10k products is far past any POS catalog.
const MAX_PRODUCT_PAGES = 100;

/**
 * Medusa's admin list defaults to a single 50-item page — without this walk a
 * catalog larger than that is silently truncated in the POS.
 */
const fetchAllProductPages = async (
  salesChannelId: string
): Promise<AdminProduct[]> => {
  const sdk = getSdk();
  const all: AdminProduct[] = [];

  for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
    const { products, count } = await sdk.admin.product.list({
      sales_channel_id: [salesChannelId],
      fields: MEDUSA_PRODUCT_FIELDS,
      limit: PRODUCT_PAGE_SIZE,
      offset: all.length,
    });

    all.push(...products);
    if (products.length === 0 || all.length >= count) return all;
  }

  void logger.warn(
    `product pagination hit the ${MAX_PRODUCT_PAGES}-page ceiling; catalog may be truncated`
  );
  return all;
};

const fetchProducts = async (
  salesChannelId: string
): Promise<AdminProduct[]> => {
  if (!salesChannelId) {
    return [];
  }

  if (await isPosPluginInstalled()) {
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
    const products = await fetchAllProductPages(salesChannelId);
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
    queryKey: queryKeys.products.list(salesChannelId),
    queryFn: () => fetchProducts(salesChannelId!),
    enabled: isAuthenticated && !!salesChannelId,
  });
};

export { useQueryProducts, fetchProducts };
