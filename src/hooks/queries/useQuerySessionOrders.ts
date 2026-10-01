import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { AdminOrder } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { useUser } from "@/context/user";
import { logger, safeStringify } from "@/utils/logger";
import type { RegisterSession } from "@/types/register";

const CASH_FIELDS =
  "id,status,total,refunded_total,created_at,metadata,fulfillment_status,payment_collections.payments.provider_id,payment_collections.payments.amount,payment_collections.payments.refunds.amount,payment_collections.payment_sessions.provider_id";

// The server filters by date, so a shift downloads its own orders — not the last 1000
// with every line item (that was ~1.6 MB on a store with 258 orders).
const fetchSessionOrders = async (openedAt: string): Promise<AdminOrder[]> => {
  try {
    const { orders } = await getSdk().admin.order.list({
      fields: CASH_FIELDS,
      created_at: { $gte: openedAt },
      limit: 1000,
      offset: 0,
      order: "-created_at",
    });
    return orders as AdminOrder[];
  } catch (error) {
    void logger.error(`fetchSessionOrders failed: ${safeStringify(error)}`);
    throw error;
  }
};

// The open register's orders for expected cash. Attribution happens in useExpectedCash.
const useQuerySessionOrders = (
  session: RegisterSession | null
): UseQueryResult<AdminOrder[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const openedAt = session?.openedAt;

  return useQuery<AdminOrder[], Error>({
    queryKey: queryKeys.orders.session(openedAt),
    queryFn: () => fetchSessionOrders(openedAt!),
    enabled: isAuthenticated && !!openedAt && session?.status === "open",
    refetchInterval: 5 * 60 * 1000,
  });
};

export { useQuerySessionOrders };
