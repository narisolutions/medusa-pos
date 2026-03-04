import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

const fetchUnfulfilledOrdersCount = async (): Promise<number> => {
  try {
    const sdk = getSdk();
    let totalUnfulfilled = 0;
    let offset = 0;
    const limit = 1000; 
    let hasMore = true;

    // Paginate through all orders to count unfulfilled ones
    while (hasMore) {
      const { orders, count } = await sdk.admin.order.list({
        fields: "fulfillment_status",
        limit,
        offset,
        order: "-created_at",
      });

      // Filter and count unfulfilled orders in this batch
      const unfulfilledInBatch = (orders as AdminOrder[]).filter(
        (order) => order.fulfillment_status === "not_fulfilled"
      ).length;

      totalUnfulfilled += unfulfilledInBatch;

      if (offset + limit >= count || orders.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    return totalUnfulfilled;
  } catch (error) {
    handleErrorToast(error);
    return 0;
  }
};

const useUnfulfilledOrdersCount = (): UseQueryResult<number, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<number, Error>({
    queryKey: ["orders", "unfulfilled-count"],
    queryFn: fetchUnfulfilledOrdersCount,
    enabled: isAuthenticated,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export { useUnfulfilledOrdersCount };

