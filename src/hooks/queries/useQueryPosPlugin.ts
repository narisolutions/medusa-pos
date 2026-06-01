import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useUser } from "@/context/user";
import { isPosPluginInstalled } from "@/utils/pos/plugin";

/**
 * Reactive wrapper around {@link isPosPluginInstalled} for UI that needs to know
 * whether the Medusa POS plugin (`/pos/*` routes) is available on the backend.
 */
const useQueryPosPlugin = (): UseQueryResult<boolean, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<boolean, Error>({
    queryKey: ["pos-plugin-installed"],
    queryFn: isPosPluginInstalled,
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};

export { useQueryPosPlugin };
