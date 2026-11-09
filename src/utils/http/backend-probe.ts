import { checkBackendHealth } from "@/utils/helpers";

/** What one check of the backend's /health found. Mirrors `ProbeKind` in src-tauri/src/backend_probe.rs. */
type ProbeKind =
  | "ok"
  | "http_error"
  | "other_host"
  | "refused"
  | "not_found"
  | "unreachable"
  | "timed_out"
  | "tls"
  | "error"
  /** The device itself has no network; set here, not by the probe. */
  | "no_network";

type ProbeResult = {
  kind: ProbeKind;
  status: number | null;
  answeredBy: string | null;
  detail: string | null;
  elapsedMs: number;
};

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Checks the backend once. In the app a Rust command reads the real cause of a failure
 * (the HTTP plugin's fetch reports them all alike); in a plain browser it can only say
 * reachable or not.
 */
async function probeBackend(baseUrl: string, timeoutMs: number): Promise<ProbeResult> {
  let result: ProbeResult;
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      result = await invoke<ProbeResult>("probe_backend", { baseUrl, timeoutMs });
    } catch (error) {
      // A failing probe is a failed check, never a check that never ends.
      result = { kind: "error", status: null, answeredBy: null, detail: String(error), elapsedMs: 0 };
    }
  } else {
    const started = Date.now();
    const { success, error } = await checkBackendHealth(baseUrl, { timeoutMs });
    result = { kind: success ? "ok" : "error", status: null, answeredBy: null, detail: error ?? null, elapsedMs: Date.now() - started };
  }
  return withDeviceNetwork(result, typeof navigator === "undefined" || navigator.onLine);
}

/** A failure while the device reports no network is the device's, not the server's. */
function withDeviceNetwork(result: ProbeResult, deviceOnline: boolean): ProbeResult {
  return result.kind !== "ok" && !deviceOnline ? { ...result, kind: "no_network" } : result;
}

/** Whole minutes and hours of an outage, for "lost for 2 min" / "1 h 5 min". Null under a minute. */
function outageAge(ms: number): { hours: number; minutes: number } | null {
  if (ms < 60_000) return null;
  const totalMinutes = Math.floor(ms / 60_000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** What a run of checks adds up to: the outage clock and how many checks failed in a row. */
type OutageTracker = { url: string; lastAnsweredAt: number | null; lostSince: number | null; failures: number };

const emptyTracker = (url: string): OutageTracker => ({ url, lastAnsweredAt: null, lostSince: null, failures: 0 });

/**
 * Folds one check into the tracker. An outage runs from the last good answer (else the first
 * failed check) until the next good one, and a tracker for another backend address starts over.
 */
function recordCheck(tracker: OutageTracker, url: string, ok: boolean, at: number): OutageTracker {
  const base = tracker.url === url ? tracker : emptyTracker(url);
  if (ok) return { url, lastAnsweredAt: at, lostSince: null, failures: 0 };
  return {
    ...base,
    failures: base.failures + 1,
    lostSince: base.lostSince ?? base.lastAnsweredAt ?? at,
  };
}

export { probeBackend, withDeviceNetwork, outageAge, emptyTracker, recordCheck };
export type { ProbeKind, ProbeResult, OutageTracker };
