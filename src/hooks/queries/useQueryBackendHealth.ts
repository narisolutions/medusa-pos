import { useEffect } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { getSdkBaseUrl } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { useStoreManager } from "@/context/store-manager";
import { useUser } from "@/context/user";
import { emptyTracker, probeBackend, recordCheck, type OutageTracker, type ProbeResult } from "@/utils/http/backend-probe";

const CHECK_EVERY_MS = 30_000;
// After a first failed check, look again soon: one missed request is often a blip.
const RECHECK_AFTER_FAILURE_MS = 3_000;
// Once it keeps failing, check often so the till notices the moment it's back.
const CHECK_WHILE_LOST_MS = 10_000;
const TIMEOUT_MS = 5_000;
/** The band only shows once a failure has repeated; a single one may be a blip. */
const FAILURES_TO_BE_LOST = 2;

type BackendHealth = {
  probe: ProbeResult;
  checkedAt: number;
  /** When the backend last answered OK this session; null if it never has. */
  lastAnsweredAt: number | null;
  /** Since when it hasn't answered: the last good answer, else the first failed check. */
  lostSince: number | null;
  /** Failed checks in a row. */
  failures: number;
};

const isLost = (health: BackendHealth | undefined): health is BackendHealth =>
  !!health && health.failures >= FAILURES_TO_BE_LOST;

// Kept across checks: one check alone can't know when an outage began. Per backend address,
// so switching stores (or logging out) never carries an old outage over.
let tracker: OutageTracker = emptyTracker("");

const checkBackend = async (): Promise<BackendHealth> => {
  const url = getSdkBaseUrl();
  const probe = await probeBackend(url, TIMEOUT_MS);
  const checkedAt = Date.now();
  tracker = recordCheck(tracker, url, probe.kind === "ok", checkedAt);
  const { lastAnsweredAt, lostSince, failures } = tracker;
  return { probe, checkedAt, lastAnsweredAt, lostSince, failures };
};

const nextCheckIn = (health: BackendHealth | undefined): number => {
  if (health?.probe.kind === "ok") return CHECK_EVERY_MS;
  return health && health.failures < FAILURES_TO_BE_LOST ? RECHECK_AFTER_FAILURE_MS : CHECK_WHILE_LOST_MS;
};

/**
 * Whether and how the backend answers, for the header, the "connection lost" band and its
 * details sheet. Polled, re-checked at once when the OS reports the network dropping or
 * coming back. Observers share one query, so two checks never run at once.
 */
const useQueryBackendHealth = (
  { intervalMs }: { intervalMs?: number } = {}
): UseQueryResult<BackendHealth, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const backendUrl = useStoreManager((state) => state.activeStore?.backendUrl);
  const queryClient = useQueryClient();

  const query = useQuery<BackendHealth, Error>({
    queryKey: [...queryKeys.backendHealth, backendUrl ?? ""],
    queryFn: checkBackend,
    enabled: isAuthenticated,
    refetchInterval: (q) => {
      const base = nextCheckIn(q.state.data);
      return intervalMs ? Math.min(intervalMs, base) : base;
    },
    refetchIntervalInBackground: true,
    retry: false,
  });

  // Logged out: forget the old outage so the next session starts clean.
  useEffect(() => {
    if (isAuthenticated) return;
    tracker = emptyTracker("");
    queryClient.removeQueries({ queryKey: queryKeys.backendHealth });
  }, [isAuthenticated, queryClient]);

  const { refetch } = query;
  useEffect(() => {
    const recheck = () => void refetch({ cancelRefetch: false });
    window.addEventListener("online", recheck);
    window.addEventListener("offline", recheck);
    return () => {
      window.removeEventListener("online", recheck);
      window.removeEventListener("offline", recheck);
    };
  }, [refetch]);

  return query;
};

export { useQueryBackendHealth, isLost };
export type { BackendHealth };
