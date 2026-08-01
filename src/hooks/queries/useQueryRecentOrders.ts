import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { logger, safeStringify } from "@/utils/logger";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

// Shared recent-orders scan (badge + expected-cash project via `select`). Filtering is
// client-side (backend can't filter fulfillment_status); errors log silently (background poll).

// The sidebar badge needs a status; expected-cash needs the payment-collection
// joins. Cash reconciliation is off by default, so most installs poll the light
// shape and never pay for the joins.
const BADGE_FIELDS = "id,created_at,fulfillment_status";
const CASH_FIELDS =
  "id,status,total,refunded_total,created_at,metadata,fulfillment_status,payment_collections.payments.provider_id,payment_collections.payments.amount,payment_collections.payments.refunds.amount,payment_collections.payment_sessions.provider_id";

const fetchRecentOrders = async (
  withCashDetail = true
): Promise<AdminOrder[]> => {
  try {
    const sdk = getSdk();
    const { orders } = await sdk.admin.order.list({
      fields: withCashDetail ? CASH_FIELDS : BADGE_FIELDS,
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
  /** Request the payment-collection joins — expected-cash only. */
  withCashDetail?: boolean;
}

const useQueryRecentOrders = <T = AdminOrder[]>(
  options?: UseQueryRecentOrdersOptions<T>
): UseQueryResult<T, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const withCashDetail = options?.withCashDetail ?? false;

  return useQuery<AdminOrder[], Error, T>({
    queryKey: queryKeys.orders.recent(withCashDetail),
    queryFn: () => fetchRecentOrders(withCashDetail),
    enabled: isAuthenticated && (options?.enabled ?? true),
    refetchInterval: 5 * 60 * 1000,
    select: options?.select,
  });
};

export { useQueryRecentOrders, fetchRecentOrders };
