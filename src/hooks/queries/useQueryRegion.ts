import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";
import { AdminRegion } from "@medusajs/types";

interface RegionsResult {
  regions: AdminRegion[];
  defaultRegion: AdminRegion | null;
}

const fetchRegions = async (): Promise<RegionsResult> => {
  try {
    const sdk = getSdk();
    const { regions } = await sdk.admin.region.list();

    const defaultRegion = regions.length > 0 ? regions[0] : null;

    return { regions, defaultRegion };
  } catch (error) {
    handleErrorToast(error);
    return { regions: [], defaultRegion: null };
  }
};

const useQueryRegion = (): UseQueryResult<RegionsResult, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<RegionsResult, Error>({
    queryKey: ["regions"],
    queryFn: fetchRegions,
    enabled: isAuthenticated,
  });
};

export { useQueryRegion, fetchRegions };
export type { RegionsResult };
