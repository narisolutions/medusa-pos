import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "@/config/query";
import { useUser } from "@/context/user";
import { getOpenOrderChange } from "@/hooks/order/useOrderChange";

type OpenOrderChange = Awaited<ReturnType<typeof getOpenOrderChange>>;

/** The order's open change, if any — another till or Medusa Admin may have one pending. */
const useQueryOpenOrderChange = (
  orderId: string | undefined
): UseQueryResult<OpenOrderChange, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<OpenOrderChange, Error>({
    queryKey: queryKeys.orders.openChange(orderId ?? ""),
    queryFn: () => getOpenOrderChange(orderId!),
    enabled: isAuthenticated && !!orderId,
  });
};

export { useQueryOpenOrderChange };
