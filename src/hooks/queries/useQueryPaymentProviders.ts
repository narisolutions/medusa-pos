import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { AdminPaymentProvider } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";

const useQueryPaymentProviders = (): UseQueryResult<AdminPaymentProvider[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminPaymentProvider[], Error>({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      const sdk = getSdk();
      const { payment_providers } = await sdk.admin.payment.listPaymentProviders({
        limit: 100,
      });
      return payment_providers as AdminPaymentProvider[];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });
};

export { useQueryPaymentProviders };
