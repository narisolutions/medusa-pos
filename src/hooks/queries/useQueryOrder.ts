import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk, initializeSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminOrder } from "@medusajs/types";

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
    // Don't show toast for SDK initialization errors during HMR
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes("SDK not initialized")) {
      handleErrorToast(error);
    }
    // Re-throw the error so React Query can handle it properly
    throw error;
  }
};

const useQueryOrder = (
  orderId: string
): UseQueryResult<AdminOrder | null, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminOrder | null, Error>({
    queryKey: ["order", orderId],
    queryFn: async () => {
      // Try to initialize SDK if it's not ready (HMR issue)
      try {
        getSdk(); // Check if SDK is initialized
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("SDK not initialized")) {
          // Try to initialize SDK
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            const config = await invoke<{ backend_url: string }>("load_config");
            await initializeSdk(config.backend_url);
          } catch {
            // If initialization fails, wait a bit and try fetching anyway
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      return await fetchOrder(orderId);
    },
    enabled: isAuthenticated && !!orderId,
    retry: (failureCount, error) => {
      // Retry if SDK not initialized (HMR issue)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("SDK not initialized")) {
        return failureCount < 3; // Retry up to 3 times
      }
      return failureCount < 1; // Otherwise retry once
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff
  });
};

export { useQueryOrder, fetchOrder };
