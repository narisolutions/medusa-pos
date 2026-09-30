import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { AdminOrderChange } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { useUser } from "@/context/user";
import { findOpenChange } from "@/utils/pos/order-change";

const fetchOrderChanges = async (orderId: string): Promise<AdminOrderChange[]> => {
  const { order_changes } = await getSdk().admin.order.listChanges(orderId, {
    fields: "id,change_type,status,confirmed_at,description,return_id,*actions",
  });
  return order_changes;
};

/** The backend's change log for an order: the activity timeline and the open-change check. */
const useQueryOrderChanges = <T = AdminOrderChange[]>(
  orderId: string | undefined,
  select?: (changes: AdminOrderChange[]) => T
): UseQueryResult<T, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminOrderChange[], Error, T>({
    queryKey: queryKeys.orders.changes(orderId ?? ""),
    queryFn: () => fetchOrderChanges(orderId!),
    enabled: isAuthenticated && !!orderId,
    select,
  });
};

const selectOpenChange = (changes: AdminOrderChange[]) => findOpenChange(changes) ?? null;

/** The order's open change, if any — another till or Medusa Admin may have one pending. */
const useQueryOpenOrderChange = (orderId: string | undefined) =>
  useQueryOrderChanges(orderId, selectOpenChange);

export { useQueryOrderChanges, useQueryOpenOrderChange };
