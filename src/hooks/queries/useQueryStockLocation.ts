import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys, STALE_TIME } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminStockLocation } from "@medusajs/types";
import storage from "@/utils/storage";

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

/** The stock location this till books stock into; null when not configured. */
const useQueryTerminalStockLocationId = (): UseQueryResult<string | null, Error> =>
  useQuery<string | null, Error>({
    queryKey: queryKeys.terminalStockLocationId,
    queryFn: async () => (await storage.getItem("stock_location_id")) || null,
    staleTime: 0,
  });

export { useQueryStockLocation, useQueryTerminalStockLocationId, fetchStockLocations };
