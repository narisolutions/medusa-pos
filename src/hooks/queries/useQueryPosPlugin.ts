import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "@/config/query";
import { useUser } from "@/context/user";
import { isPosPluginInstalled } from "@/utils/pos/plugin";

/** Reactive wrapper around isPosPluginInstalled (backend `/pos/*` availability). */
const useQueryPosPlugin = (): UseQueryResult<boolean, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<boolean, Error>({
    queryKey: queryKeys.posPlugin,
    queryFn: isPosPluginInstalled,
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};

export { useQueryPosPlugin };
