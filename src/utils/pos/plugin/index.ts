import { getSdk } from "@/config/medusa";

/**
 * Detects whether the Medusa POS plugin (`@narisolutions/medusa-plugin-pos`) is
 * installed on the connected backend by probing its `/pos/health` route.
 *
 * The result is cached for the session. Call `resetPosPluginCache()` when the
 * backend URL changes or on logout so detection re-runs against the new backend.
 */
let installedCache: Promise<boolean> | null = null;

/**
 * Only an answer proves the route is missing. No answer at all (offline) or a failing
 * backend (5xx) proves nothing, so it is neither reported as "not installed" nor cached:
 * a network blip would otherwise switch the plugin off until the next logout.
 */
export const isInconclusiveProbe = (error: unknown): boolean => {
  const status = (error as { status?: number } | null)?.status;
  return status === undefined || status >= 500;
};

export async function isPosPluginInstalled(): Promise<boolean> {
  if (!installedCache) {
    const probe = (async () => {
      try {
        await getSdk().client.fetch("/pos/health", { method: "GET" });
        return true;
      } catch (error) {
        if (isInconclusiveProbe(error)) throw error;
        return false;
      }
    })();
    installedCache = probe;
    probe.catch(() => {
      if (installedCache === probe) installedCache = null;
    });
  }
  return installedCache;
}

export function resetPosPluginCache(): void {
  installedCache = null;
}
