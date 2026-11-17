import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys, STALE_TIME } from "@/config/query";
import { useUser } from "@/context/user";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { storeVatRate } from "@/utils/customer-display/vat";
import { logger, safeStringify } from "@/utils/logger";

const fetchVatRate = async (countryCodes: string[]): Promise<number> => {
  try {
    const { tax_regions } = await getSdk().admin.taxRegion.list({
      fields: "id,country_code,province_code,parent_id,*tax_rates",
      limit: 200,
    });
    return storeVatRate(tax_regions, countryCodes);
  } catch (error) {
    // No toast: nothing the cashier can do, and "unknown" is a safe answer.
    void logger.warn(`Tax rate not read: ${safeStringify(error)}`);
    throw error;
  }
};

/**
 * The store's VAT rate, read once after sign-in and cached like the region. `data` is
 * undefined while it loads and when the read failed: unknown, never assumed.
 */
const useQueryVatRate = (): UseQueryResult<number, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const { data: regionData } = useQueryRegion();
  const countryCodes = (regionData?.defaultRegion?.countries ?? []).flatMap((country) => (country.iso_2 ? [country.iso_2] : []));

  return useQuery<number, Error>({
    queryKey: [...queryKeys.vatRate, countryCodes],
    queryFn: () => fetchVatRate(countryCodes),
    // After the region, so the rate is the one of the store's own countries.
    enabled: isAuthenticated && regionData !== undefined,
    staleTime: STALE_TIME.static,
    retry: 1,
  });
};

export { useQueryVatRate, fetchVatRate };
