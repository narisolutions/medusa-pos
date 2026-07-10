import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk, initializeSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

// Dev HMR can reset the SDK singleton mid-session — retry these instead of toasting.
const isSdkNotInitializedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("SDK not initialized");
};

const fetchOrder = async (orderId: string): Promise<AdminOrder | null> => {
  if (!orderId) {
    return null;
  }

  try {
    const sdk = getSdk();
    const { order } = await sdk.admin.order.retrieve(orderId, {
      fields:
        "*items,*items.variant,*customer,*sales_channel,*shipping_address,*shipping_methods,*billing_address,*fulfillments.*,*fulfillments.shipping_option.*,*payment_collections,*payment_collections.payments,*payment_collections.payment_sessions,payment_collections.payments.provider_id,payment_collections.payment_sessions.provider_id,*region,*summary,display_id,status,payment_status,fulfillment_status,created_at,updated_at,total,subtotal,tax_total,discount_total,shipping_total,currency_code,metadata",
    });

    return order as AdminOrder;
  } catch (error) {
    if (!isSdkNotInitializedError(error)) {
      handleErrorToast(error);
    }
    // Re-throw so React Query owns the error state (and the retry policy below).
    throw error;
  }
};

const useQueryOrder = (
  orderId: string
): UseQueryResult<AdminOrder | null, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminOrder | null, Error>({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      // Recover the SDK singleton if HMR reset it (see isSdkNotInitializedError).
      try {
        getSdk();
      } catch (error) {
        if (isSdkNotInitializedError(error)) {
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            const config = await invoke<{ backend_url: string }>("load_config");
            await initializeSdk(config.backend_url);
          } catch {
            // If initialization fails, wait a bit and try fetching anyway
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      return await fetchOrder(orderId);
    },
    enabled: isAuthenticated && !!orderId,
    retry: (failureCount, error) => {
      if (isSdkNotInitializedError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });
};

export { useQueryOrder, fetchOrder };
