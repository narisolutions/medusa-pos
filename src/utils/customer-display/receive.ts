import type { DisplayState } from "@/types/customer-display";
import { displayStateSchema } from "@/utils/schemas/customer-display";

/** Three missed heartbeats: the till is gone, and old prices must not stay up. */
export const STALE_AFTER_MS = 15_000;

export type Received =
  | { state: DisplayState }
  /** Older than what is shown: expected now and then, and ignored. */
  | { ignored: "older" }
  /** Not a screen this build understands: worth a log line, since the display will go quiet. */
  | { ignored: "invalid"; reason: string };

/**
 * The next screen, or why the current one stays. A restarted till counts from 1 again,
 * so 1 is always taken.
 */
export function receiveState(current: DisplayState | null, payload: unknown): Received {
  const parsed = displayStateSchema.safeParse(payload);
  if (!parsed.success) {
    const reason = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    return { ignored: "invalid", reason };
  }
  const next = parsed.data;
  if (current && next.seq <= current.seq && next.seq !== 1) return { ignored: "older" };
  return { state: next };
}

export const isStale = (lastReceivedAt: number, now: number): boolean => now - lastReceivedAt > STALE_AFTER_MS;

type Lines = Extract<DisplayState, { lines: unknown }>["lines"];

/** The line the buyer should look at: one just added, or one whose quantity changed. */
export function changedLineKey(previous: Lines | undefined, next: Lines): string | undefined {
  const before = new Map((previous ?? []).map((line) => [line.key, line.quantity]));
  for (let i = next.length - 1; i >= 0; i--) {
    const line = next[i];
    if (before.get(line.key) !== line.quantity) return line.key;
  }
  return undefined;
}
