import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { logger, safeStringify } from "@/utils/logger";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

// Shared recent-orders scan (badge + expected-cash project via `select`). Filtering is
// client-side (backend can't filter fulfillment_status); errors log silently (background poll).

// Union of the fields both consumers read.
const RECENT_ORDERS_FIELDS =
  "id,status,total,refunded_total,created_at,metadata,fulfillment_status,payment_collections.payments.provider_id,payment_collections.payments.amount,payment_collections.payments.refunds.amount,payment_collections.payment_sessions.provider_id";

const fetchRecentOrders = async (): Promise<AdminOrder[]> => {
  try {
    const sdk = getSdk();
    const { orders } = await sdk.admin.order.list({
      fields: RECENT_ORDERS_FIELDS,
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
