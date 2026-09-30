/**
 * Runs a post-sale operation (charge, return, exchange) as one all-or-nothing
 * sequence of backend calls. See docs/post-sale/03-order-changes.md.
 *
 * Each step may register an undo once it succeeds. On failure the registered
 * undos run newest first. A step whose undo covers everything before it — e.g.
 * `return.cancel` once `confirmRequest` has run, where `cancelRequest` is
 * rejected — sets `replacesUndo`.
 */
export type OrderChangeStep = {
  /** Stable name, used for progress text and in the outcome. */
  key: string;
  run: () => Promise<void>;
  undo?: () => Promise<void>;
  replacesUndo?: boolean;
};

export type OrderChangeOutcome =
  | { status: "applied" }
  | { status: "rolled_back"; failedStep: string; error: unknown }
  /** The undo failed too: a change is left open on the order and needs a person. */
  | { status: "stranded"; failedStep: string; error: unknown; undoError: unknown };

/** A change still pending or requested blocks any new one; the backend rejects it too. */
export function findOpenChange<T extends { status?: string | null }>(
  changes: T[]
): T | undefined {
  return changes.find((c) => c.status === "pending" || c.status === "requested");
}

/** Thrown before anything runs when the order already has an open change. */
export class OrderChangeBlockedError extends Error {
  constructor(
    readonly orderId: string,
    readonly changeType: string | null
  ) {
    super(`Order ${orderId} already has an open ${changeType ?? "order"} change`);
    this.name = "OrderChangeBlockedError";
  }
}

/** Thrown by `useOrderChange` when an operation did not apply. */
export class OrderChangeError extends Error {
  constructor(
    readonly orderId: string,
    readonly outcome: Exclude<OrderChangeOutcome, { status: "applied" }>
  ) {
    super(`Order change on ${orderId} ${outcome.status} at ${outcome.failedStep}`);
    this.name = "OrderChangeError";
  }
}

export async function runOrderChange(
  steps: OrderChangeStep[],
  onStep?: (key: string) => void
): Promise<OrderChangeOutcome> {
  let undos: (() => Promise<void>)[] = [];

  for (const step of steps) {
    onStep?.(step.key);
    try {
      await step.run();
    } catch (error) {
      for (const undo of [...undos].reverse()) {
        try {
          await undo();
        } catch (undoError) {
          return { status: "stranded", failedStep: step.key, error, undoError };
        }
      }
      return { status: "rolled_back", failedStep: step.key, error };
    }
    if (step.undo) undos = step.replacesUndo ? [step.undo] : [...undos, step.undo];
  }

  return { status: "applied" };
}
