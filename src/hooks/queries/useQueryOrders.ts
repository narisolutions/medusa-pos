import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
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
        "display_id,status,total,created_at,currency_code,*items,customer.email,*sales_channel,payment_status,fulfillment_status, fulfillments.*, *shipping_methods",
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

    const sortedOrders = (orders as AdminOrder[]).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      orders: sortedOrders,
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
    queryKey: [
      "orders",
      options?.fields,
      options?.expand,
      options?.limit,
      options?.offset,
      options?.q,
      options?.status,
      options?.customer_email,
      options?.sales_channel,
      options?.created_at,
      options?.payment_status,
    ],
    queryFn: () => fetchOrders(sdkOptions),
    enabled: isAuthenticated,
    refetchInterval,
  });
};

export { useQueryOrders, fetchOrders };
export type { OrdersResult };
