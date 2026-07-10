import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";
import { OrdersResult, UseQueryOrdersOptions } from "@/types/utils";

const fetchOrders = async (
  options?: UseQueryOrdersOptions
): Promise<OrdersResult | undefined> => {
  try {
    const baseParams = {
      fields:
        options?.fields ||
        // Table columns only — heavy relations (*items etc.) excluded; detail view fetches its own.
        "display_id,status,total,created_at,currency_code,customer.email,sales_channel.name,payment_status,fulfillment_status,shipping_methods.name,metadata,payment_collections.payments.provider_id,payment_collections.payment_sessions.provider_id",
      limit: options?.limit || 10,
      offset: options?.offset || 0,
      order: "-created_at",
    };

    const filteredOptions = Object.entries(options || {})
      .filter(([, value]) => value !== undefined && value !== "All")
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const queryParams = { ...baseParams, ...filteredOptions };

    const sdk = getSdk();
    const { orders, count, limit, offset } =
      await sdk.admin.order.list(queryParams);

    // The API already returns orders sorted by `order: "-created_at"`, so a
    // client-side re-sort is redundant work on every fetch.
    return {
      orders: orders as AdminOrder[],
      count,
      limit,
      offset,
    };
  } catch (error) {
    handleErrorToast(error);
    return undefined;
  }
};

const useQueryOrders = (
  options?: UseQueryOrdersOptions & { refetchInterval?: number }
): UseQueryResult<OrdersResult | undefined, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  // Extract refetchInterval from options to avoid passing it to the SDK
  const { refetchInterval, ...sdkOptions } = options || {};

  return useQuery<OrdersResult | undefined, Error>({
    // Whole options object as key — new filters automatically join the cache identity.
    queryKey: queryKeys.orders.list(sdkOptions),
    queryFn: () => fetchOrders(sdkOptions),
    enabled: isAuthenticated,
    refetchInterval,
  });
};

export { useQueryOrders, fetchOrders };
export type { OrdersResult };
