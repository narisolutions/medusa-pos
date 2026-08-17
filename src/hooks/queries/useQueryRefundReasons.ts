import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { AdminRefundReason } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { queryKeys, STALE_TIME } from "@/config/query";
import { logger, safeStringify } from "@/utils/logger";
import { useUser } from "@/context/user";

// Most stores seed no refund reasons and older backends may not expose the route,
// so failures log instead of toasting — the refund dialog just hides the select.
const fetchRefundReasons = async (): Promise<AdminRefundReason[]> => {
  try {
    const sdk = getSdk();
    const { refund_reasons } = await sdk.admin.refundReason.list({ limit: 100 });
    return refund_reasons as AdminRefundReason[];
  } catch (error) {
    void logger.error(`Failed to load refund reasons: ${safeStringify(error)}`);
    return [];
  }
};

const useQueryRefundReasons = (
  enabled = true
): UseQueryResult<AdminRefundReason[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminRefundReason[], Error>({
    queryKey: queryKeys.refundReasons,
    queryFn: fetchRefundReasons,
    enabled: isAuthenticated && enabled,
    staleTime: STALE_TIME.static,
  });
};

export { useQueryRefundReasons, fetchRefundReasons };
