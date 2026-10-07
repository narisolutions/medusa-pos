import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { handleErrorToast, isNotFoundError } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

/** Everything the order page and its receipt read, including totals, status and metadata. */
export const ORDER_DETAIL_FIELDS =
  "*items,*items.detail,*items.variant,*items.tax_lines,*customer,*sales_channel,*shipping_address,*shipping_methods,*billing_address,*fulfillments.*,*fulfillments.shipping_option.*,*payment_collections,*payment_collections.payments,*payment_collections.payment_sessions,payment_collections.payments.provider_id,payment_collections.payments.refunds.*,payment_collections.payments.captures.*,payment_collections.payment_sessions.provider_id,*region,*summary,display_id,status,payment_status,fulfillment_status,created_at,updated_at,total,subtotal,tax_total,discount_total,shipping_total,refunded_total,currency_code,metadata";

const fetchOrder = async (orderId: string): Promise<AdminOrder> => {
  try {
    const { order } = await getSdk().admin.order.retrieve(orderId, {
      fields: ORDER_DETAIL_FIELDS,
    });
    return order as AdminOrder;
  } catch (error) {
    // The page says "not found" itself; anything else also gets its reason as a toast.
    if (!isNotFoundError(error)) handleErrorToast(error);
    throw error;
  }
};

const useQueryOrder = (orderId: string): UseQueryResult<AdminOrder, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminOrder, Error>({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => fetchOrder(orderId),
    enabled: isAuthenticated && !!orderId,
  });
};

export { useQueryOrder };
