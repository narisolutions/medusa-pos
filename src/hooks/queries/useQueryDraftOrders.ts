import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { AdminDraftOrder } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { useUser } from "@/context/user";
import { useSalesChannel } from "@/context/sales-channel";
import { handleErrorToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";

// Parked sales. No status or metadata filter is needed (or available on the draft-order
// list route): a draft that still exists is an unfinished sale, because paying converts
// it and clearing the cart deletes it.
const PARKED_FIELDS =
  "id,display_id,created_at,updated_at,email,total,currency_code,metadata,customer.email,customer.first_name,customer.last_name,*items";

const fetchDraftOrders = async (
  salesChannelId: string
): Promise<AdminDraftOrder[]> => {
  try {
    const sdk = getSdk();
    const { draft_orders } = await sdk.admin.draftOrder.list({
      sales_channel_id: [salesChannelId],
      fields: PARKED_FIELDS,
      limit: 500,
      offset: 0,
      order: "-updated_at",
    });

    return draft_orders as AdminDraftOrder[];
  } catch (error) {
    void logger.error(`fetchDraftOrders failed: ${safeStringify(error)}`);
    handleErrorToast(error);
    // Re-throw so React Query owns the error state. Returning undefined leaves the
    // query permanently pending, and an empty list would read as "your sale is gone".
    throw error;
  }
};

interface UseQueryDraftOrdersOptions<T> {
  select?: (draftOrders: AdminDraftOrder[]) => T;
  enabled?: boolean;
}

const useQueryDraftOrders = <T = AdminDraftOrder[]>(
  options?: UseQueryDraftOrdersOptions<T>
): UseQueryResult<T, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const salesChannelId = useSalesChannel((state) => state.salesChannelId);

  return useQuery<AdminDraftOrder[], Error, T>({
    queryKey: queryKeys.draftOrders.list(salesChannelId),
    queryFn: () => fetchDraftOrders(salesChannelId!),
    enabled: isAuthenticated && !!salesChannelId && (options?.enabled ?? true),
    // Shorter than the orders poll: a sale paid on another till must stop showing up here.
    refetchInterval: 60 * 1000,
    select: options?.select,
  });
};

export { useQueryDraftOrders, fetchDraftOrders };
