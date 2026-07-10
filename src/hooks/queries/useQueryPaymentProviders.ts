import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { AdminPaymentProvider } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { queryKeys, STALE_TIME } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";

const fetchPaymentProviders = async (): Promise<AdminPaymentProvider[]> => {
  try {
    const sdk = getSdk();
    const { payment_providers } = await sdk.admin.payment.listPaymentProviders({
      limit: 100,
    });
    return payment_providers as AdminPaymentProvider[];
  } catch (error) {
    handleErrorToast(error);
    return [];
  }
};

const useQueryPaymentProviders = (): UseQueryResult<
  AdminPaymentProvider[],
  Error
> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminPaymentProvider[], Error>({
    queryKey: queryKeys.paymentProviders,
    queryFn: fetchPaymentProviders,
    enabled: isAuthenticated,
    staleTime: STALE_TIME.static,
  });
};

export { useQueryPaymentProviders, fetchPaymentProviders };
