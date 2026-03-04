import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminProduct } from "@medusajs/types";

const fetchProducts = async (
  salesChannelId: string
): Promise<AdminProduct[]> => {
  if (!salesChannelId) {
    return [];
  }

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
