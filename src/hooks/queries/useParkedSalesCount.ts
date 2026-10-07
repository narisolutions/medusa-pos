import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { useUser } from "@/context/user";
import { useSalesChannel } from "@/context/sales-channel";
import { logger, safeStringify } from "@/utils/logger";

// The badge needs only the count, which the list route returns with a single row
// (~4 KB) — not the whole parked list with its items (~400 KB for 74 drafts).
const fetchParkedCount = async (salesChannelId: string): Promise<number> => {
  try {
    const { count } = await getSdk().admin.draftOrder.list({
      sales_channel_id: [salesChannelId],
      fields: "id",
      limit: 1,
      offset: 0,
    });
    return count ?? 0;
  } catch (error) {
    void logger.error(`fetchParkedCount failed: ${safeStringify(error)}`);
    throw error;
  }
};

// Sidebar badge. Under the draft-orders key, so parking, resuming or paying refreshes it.
const useParkedSalesCount = (): UseQueryResult<number, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const salesChannelId = useSalesChannel((state) => state.salesChannelId);

  return useQuery<number, Error>({
    queryKey: queryKeys.draftOrders.count(salesChannelId),
    queryFn: () => fetchParkedCount(salesChannelId!),
    enabled: isAuthenticated && !!salesChannelId,
    // A sale paid on another till must stop counting here.
    refetchInterval: 60 * 1000,
  });
};

export { useParkedSalesCount };
