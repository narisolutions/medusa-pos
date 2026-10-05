import { useMemo } from "react";
import { useQuerySessionOrders } from "@/hooks/queries/useQuerySessionOrders";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { computeExpectedCash, ordersForSession } from "@/utils/pos/register";
import type { RegisterSession } from "@/types/register";

/**
 * Live expected drawer cash for an open session. Attributes orders by the stamped
 * `register_session_id` when present, otherwise by the created_at window (the
 * documented fallback for orders predating the feature).
 */
export const useExpectedCash = (session: RegisterSession | null) => {
  const { data: orders, isLoading } = useQuerySessionOrders(session);
  const { data: store } = useQueryStore();

  const expectedCash = useMemo(() => {
    if (!session) return 0;
    return computeExpectedCash(session, ordersForSession(orders ?? [], session), store);
  }, [session, orders, store]);

  return { expectedCash, isLoading, orders: orders ?? [] };
};
