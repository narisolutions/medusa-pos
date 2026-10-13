import { useEffect } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getSdkBaseUrl } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { checkBackendHealth } from "@/utils/helpers";
import { useUser } from "@/context/user";

const CHECK_EVERY_MS = 30_000;
const TIMEOUT_MS = 5_000;

/**
 * Whether the backend answers its /health route, for the header's status. Polled, and
 * re-checked at once when the OS reports the network dropping or coming back.
 */
const useQueryBackendHealth = (): UseQueryResult<boolean, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  const query = useQuery<boolean, Error>({
    queryKey: queryKeys.backendHealth,
    queryFn: async () => (await checkBackendHealth(getSdkBaseUrl(), { timeoutMs: TIMEOUT_MS })).success,
    enabled: isAuthenticated,
    refetchInterval: CHECK_EVERY_MS,
    refetchIntervalInBackground: true,
    retry: false,
  });

  const { refetch } = query;
  useEffect(() => {
    const recheck = () => void refetch();
    window.addEventListener("online", recheck);
    window.addEventListener("offline", recheck);
    return () => {
      window.removeEventListener("online", recheck);
      window.removeEventListener("offline", recheck);
    };
  }, [refetch]);

  return query;
};

export { useQueryBackendHealth };
