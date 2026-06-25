import { useMemo } from "react";
import { useQuerySessionOrders } from "@/hooks/queries/useQuerySessionOrders";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { computeExpectedCash } from "@/utils/pos/register";
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
    const relevant = (orders ?? []).filter((order) => {
      const sid = (order.metadata as Record<string, unknown> | null | undefined)
        ?.register_session_id;
      if (typeof sid === "string" && sid.length > 0) return sid === session.id;
      return true;
    });
    return computeExpectedCash(session, relevant, store);
  }, [session, orders, store]);

  return { expectedCash, isLoading, orders: orders ?? [] };
};
