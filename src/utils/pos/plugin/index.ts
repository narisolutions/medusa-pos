import { getSdk } from "@/config/medusa";

/**
 * Detects whether the Medusa POS plugin (`@narisolutions/medusa-plugin-pos`) is
 * installed on the connected backend by probing its `/pos/health` route.
 *
 * The result is cached for the session. Call `resetPosPluginCache()` when the
 * backend URL changes or on logout so detection re-runs against the new backend.
 */
let installedCache: Promise<boolean> | null = null;

export async function isPosPluginInstalled(): Promise<boolean> {
  if (!installedCache) {
    installedCache = (async () => {
      try {
        await getSdk().client.fetch("/pos/health", { method: "GET" });
        return true;
      } catch {
        return false;
      }
    })();
  }
  return installedCache;
}

export function resetPosPluginCache(): void {
  installedCache = null;
}
