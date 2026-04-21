import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminPromotion } from "@medusajs/types";

interface PromotionsResult {
  promotions: AdminPromotion[];
  count: number;
}

const fetchPromotions = async (): Promise<PromotionsResult | undefined> => {
  try {
    const sdk = getSdk();
    const { promotions, count } = await sdk.admin.promotion.list({
      limit: 100,
      fields: "id,code,status,*application_method",
    });
    return { promotions: promotions as AdminPromotion[], count };
  } catch (error) {
    handleErrorToast(error);
    return undefined;
  }
};

const useQueryPromotions = (): UseQueryResult<PromotionsResult | undefined, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<PromotionsResult | undefined, Error>({
    queryKey: ["promotions"],
    queryFn: fetchPromotions,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
};

export { useQueryPromotions, fetchPromotions };
export type { PromotionsResult };
