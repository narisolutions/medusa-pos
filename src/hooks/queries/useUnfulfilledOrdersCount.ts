import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

const fetchUnfulfilledOrdersCount = async (): Promise<number> => {
  try {
    const sdk = getSdk();

    // The admin order list endpoint cannot filter by fulfillment_status (it is a
    // derived status, not a server-side filter), so the count is computed client-side.
    // Rather than paginate the entire order history on every app load, scan only the
    // most recent page: the sidebar badge caps at "99+", and unfulfilled orders are by
    // nature recent (older orders get fulfilled), so a single request is sufficient.
    const { orders } = await sdk.admin.order.list({
      fields: "fulfillment_status",
      limit: 1000,
      offset: 0,
      order: "-created_at",
    });

    return (orders as AdminOrder[]).filter(
      (order) => order.fulfillment_status === "not_fulfilled"
    ).length;
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

