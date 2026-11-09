import { useMemo } from "react";
import { useQuerySessionOrders } from "@/hooks/queries/useQuerySessionOrders";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { computeExpectedCash, ordersForSession } from "@/utils/pos/register";
import { buildSessionReport } from "@/utils/pos/register/report";
import type { RegisterSession } from "@/types/register";

/**
 * Live expected drawer cash, and the X/Z figures, for an open session. Attributes orders by the stamped
 * `register_session_id` when present, otherwise by the created_at window (the
 * documented fallback for orders predating the feature).
 */
export const useExpectedCash = (session: RegisterSession | null) => {
  const { data: orders, isLoading, isError, refetch } = useQuerySessionOrders(session);
  const { data: store } = useQueryStore();

  const { expectedCash, report } = useMemo(() => {
    if (!session) return { expectedCash: 0, report: null };
    const own = ordersForSession(orders ?? [], session);
    return {
      expectedCash: computeExpectedCash(session, own, store),
      report: buildSessionReport(session, own, store),
    };
  }, [session, orders, store]);

  return { expectedCash, report, isLoading, isError, refetch, orders: orders ?? [] };
};
