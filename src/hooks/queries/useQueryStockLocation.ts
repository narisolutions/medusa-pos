import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys, STALE_TIME } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminStockLocation } from "@medusajs/types";

const fetchStockLocations = async (): Promise<AdminStockLocation[]> => {
  try {
    const sdk = getSdk();
    const { stock_locations } = await sdk.admin.stockLocation.list();
    return stock_locations;
  } catch (error) {
    handleErrorToast(error);
    return [];
  }
};

const useQueryStockLocation = (): UseQueryResult<AdminStockLocation[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminStockLocation[], Error>({
    queryKey: queryKeys.stockLocations,
    queryFn: fetchStockLocations,
    enabled: isAuthenticated,
    staleTime: STALE_TIME.static,
  });
};

export { useQueryStockLocation, fetchStockLocations };
