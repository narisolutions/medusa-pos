import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { logger, safeStringify } from "@/utils/logger";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

// The sidebar badge's scan. The backend cannot filter by fulfillment_status, so the
// count is taken client-side — and Medusa adds every order's line items to compute that
// status, so this response is large whatever fields are asked for (~3.7 KB an order).
// A server-side count (a POS plugin route) is the real fix; until then it runs late and rarely.
const BADGE_FIELDS = "id,created_at,fulfillment_status";

const fetchRecentOrders = async (): Promise<AdminOrder[]> => {
  try {
    const { orders } = await getSdk().admin.order.list({
      fields: BADGE_FIELDS,
      limit: 1000,
      offset: 0,
      order: "-created_at",
    });
    return orders as AdminOrder[];
  } catch (error) {
    void logger.error(`fetchRecentOrders failed: ${safeStringify(error)}`);
    throw error;
  }
};

interface UseQueryRecentOrdersOptions<T> {
  select?: (orders: AdminOrder[]) => T;
  enabled?: boolean;
}

const useQueryRecentOrders = <T = AdminOrder[]>(
  options?: UseQueryRecentOrdersOptions<T>
): UseQueryResult<T, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminOrder[], Error, T>({
    queryKey: queryKeys.orders.recent,
    queryFn: fetchRecentOrders,
    enabled: isAuthenticated && (options?.enabled ?? true),
    refetchInterval: 5 * 60 * 1000,
    select: options?.select,
  });
};

export { useQueryRecentOrders, fetchRecentOrders };
