import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys, STALE_TIME } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminSalesChannel } from "@medusajs/types";

const fetchSalesChannels = async (): Promise<AdminSalesChannel[]> => {
  try {
    const sdk = getSdk();
    const { sales_channels } = await sdk.admin.salesChannel.list();
    return sales_channels;
  } catch (error) {
    handleErrorToast(error);
    return [];
  }
};

const useQuerySalesChannel = (): UseQueryResult<AdminSalesChannel[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminSalesChannel[], Error>({
    queryKey: queryKeys.salesChannels,
    queryFn: fetchSalesChannels,
    enabled: isAuthenticated,
    staleTime: STALE_TIME.static,
  });
};

export { useQuerySalesChannel, fetchSalesChannels };
