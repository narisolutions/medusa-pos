import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminShippingOption } from "@medusajs/types";

const fetchShippingOptions = async (): Promise<AdminShippingOption[]> => {
  try {
    const sdk = getSdk();
    const { shipping_options } = await sdk.admin.shippingOption.list();
    return shipping_options;
  } catch (error) {
    handleErrorToast(error);
    return [];
  }
};

const useQueryShippingOption = (): UseQueryResult<AdminShippingOption[], Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminShippingOption[], Error>({
    queryKey: ["shipping-options"],
    queryFn: fetchShippingOptions,
    enabled: isAuthenticated,
  });
};

export { useQueryShippingOption, fetchShippingOptions };
