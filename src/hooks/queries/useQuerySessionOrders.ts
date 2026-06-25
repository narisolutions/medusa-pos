import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { logger, safeStringify } from "@/utils/logger";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";
import type { RegisterSession } from "@/types/register";

/**
 * Orders relevant to a register session, for expected-cash computation.
 * Lower-bounded by `openedAt` (the created_at window). Per-order attribution
 * (prefer the stamped register_session_id, else fall back to the time window) is
 * applied where the result is consumed — see useExpectedCash.
 *
 * Event-driven, not polled: the query key is prefixed with "orders", so the
 * existing invalidateQueries({ queryKey: ["orders"] }) fired after each sale
 * refetches it. Expected cash therefore updates on order placement (the only
 * time it can change), with no idle polling.
 */
const useQuerySessionOrders = (
  session: RegisterSession | null
): UseQueryResult<AdminOrder[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const openedAt = session?.openedAt;

  return useQuery<AdminOrder[], Error>({
    queryKey: ["orders", "session", session?.id],
    enabled: isAuthenticated && !!session && session.status === "open",
    queryFn: async () => {
      // Failures are logged, not toasted — this refetches silently after each
      // sale; let React Query own the error (backoff + last-good data retained).
      // The consumer (useExpectedCash) tolerates a missing result via `orders ?? []`.
      try {
        const sdk = getSdk();
        // The custom Tauri fetch serializes query params via String(value), which
        // turns a nested filter like { $gte } into "[object Object]" and 500s the
        // backend. So we fetch recent orders and apply the open-shift window
        // client-side instead of via a server-side created_at filter (same pattern
        // as useUnfulfilledOrdersCount).
        const { orders } = await sdk.admin.order.list({
          fields:
            "id,status,total,refunded_total,created_at,metadata,payment_collections.payments.provider_id,payment_collections.payments.amount,payment_collections.payments.refunds.amount",
          limit: 1000,
          order: "-created_at",
        });
        const since = openedAt ? new Date(openedAt).getTime() : 0;
        return (orders as AdminOrder[]).filter(
          (o) => new Date(o.created_at as string).getTime() >= since
        );
      } catch (error) {
        void logger.error(
          `useQuerySessionOrders failed: ${safeStringify(error)}`
        );
        throw error;
      }
    },
  });
};

export { useQuerySessionOrders };
