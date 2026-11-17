import type { CartItem } from "@/types/utils";
import type { DisplayBranding, DisplayFormat, DisplayState } from "@/types/customer-display";
import { displayStateSchema } from "@/utils/schemas/customer-display";
import {
  buildScreen,
  cartView,
  settleOverlay,
  type CartTotals,
  type CartView,
  type DisplayOverlay,
  type DisplayPayment,
} from "./map";
import type { DisplayTransport } from "./transport";

/** A burst of scans sends one screen, not one per scan. */
export const PUBLISH_THROTTLE_MS = 100;
/** Resent this often, so a display that hears nothing knows the till is gone. */
export const HEARTBEAT_MS = 5_000;
const FAILED_HOLD_MS = 6_000;

export type CartSource = {
  getItems(): readonly CartItem[];
  /** The till's own totals, from the cart's getters. */
  getTotals(): CartTotals;
  subscribe(listener: () => void): () => void;
};

export type PublisherConfig = { branding: DisplayBranding; format: DisplayFormat; thanksMs: number };

type Running = {
  transport: DisplayTransport;
  cart: CartSource;
  config: PublisherConfig;
  onInvalid?: (reason: string) => void;
  stop: () => void;
};

/** In development and tests a screen that breaks the contract is a bug to fix, so it throws. */
const STRICT = import.meta.env.DEV || import.meta.env.MODE === "test";

/**
 * The till's half of the customer display: plain module state, not a store, because
 * nothing on the till renders from it. Every call is a no-op while no display runs.
 */
let running: Running | null = null;
let overlay: DisplayOverlay | null = null;
let seq = 0;
let pending: ReturnType<typeof setTimeout> | null = null;

const currentCart = (): CartView | null =>
  running
    ? cartView(running.cart.getItems(), running.cart.getTotals(), {
        showImages: running.config.format.showImages,
        currency: running.config.format.currency,
      })
    : null;

function send(): void {
  if (!running) return;
  const cart = currentCart()!;
  const now = Date.now();
  overlay = settleOverlay(overlay, cart.lines.length === 0, now);
  // Checked against the contract before it leaves: only what the schema names is sent,
  // and a screen the display would refuse is reported here, where the cause is.
  const parsed = displayStateSchema.safeParse({
    v: 1,
    seq: seq + 1,
    sentAt: now,
    branding: running.config.branding,
    format: running.config.format,
    ...buildScreen(cart, overlay),
  });
  if (!parsed.success) {
    const reason = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    if (STRICT) throw new Error(`Customer display screen breaks its contract: ${reason}`);
    running.onInvalid?.(reason);
    return;
  }
  seq += 1;
  running.transport.send(parsed.data satisfies DisplayState);
}

function schedule(): void {
  if (!running || pending) return;
  pending = setTimeout(() => {
    pending = null;
    send();
  }, PUBLISH_THROTTLE_MS);
}

export function startCustomerDisplayPublisher(
  transport: DisplayTransport,
  cart: CartSource,
  config: PublisherConfig,
  onInvalid?: (reason: string) => void
): () => void {
  stopCustomerDisplayPublisher();
  const unsubscribeCart = cart.subscribe(schedule);
  const heartbeat = setInterval(send, HEARTBEAT_MS);
  let unlistenHello: (() => void) | null = null;
  let stopped = false;
  void transport.onHello(send).then((unlisten) => {
    if (stopped) unlisten();
    else unlistenHello = unlisten;
  });
  const stop = () => {
    stopped = true;
    unsubscribeCart();
    clearInterval(heartbeat);
    unlistenHello?.();
  };
  const mine: Running = { transport, cart, config, stop, ...(onInvalid ? { onInvalid } : {}) };
  running = mine;
  send();
  // A stale stop must not end a publisher started after it.
  return () => {
    if (running === mine) stopCustomerDisplayPublisher();
  };
}

export function stopCustomerDisplayPublisher(): void {
  if (pending) clearTimeout(pending);
  pending = null;
  running?.stop();
  running = null;
  overlay = null;
}

export function configureCustomerDisplayPublisher(config: PublisherConfig): void {
  if (!running) return;
  running.config = config;
  schedule();
}

/** The payment dialog's state; `null` once it closes. The cart is frozen as it was when payment began. */
export function setDisplayPayment(payment: DisplayPayment | null): void {
  if (!running) return;
  if (payment === null) {
    if (overlay?.kind === "failed") delete overlay.resume;
    else if (overlay?.kind === "payment") overlay = null;
    else return;
  } else if (overlay?.kind === "failed" && Date.now() < overlay.until) {
    // The failure stays up for its few seconds; the dialog's latest state follows it.
    const cart = overlay.resume?.cart ?? currentCart()!;
    overlay.resume = { kind: "payment", cart, ...payment };
    return;
  } else {
    const cart = overlay?.kind === "payment" ? overlay.cart : currentCart()!;
    overlay = { kind: "payment", cart, ...payment };
  }
  schedule();
}

export function showDisplaySuccess(result: { total: number; change?: number; outstanding: boolean }): void {
  if (!running) return;
  const holdMs = running.config.thanksMs;
  overlay = { kind: "success", ...result, until: Date.now() + holdMs };
  schedule();
  setTimeout(schedule, holdMs + PUBLISH_THROTTLE_MS);
}

export function showDisplayFailure(total: number): void {
  if (!running) return;
  const resume = overlay?.kind === "payment" ? overlay : undefined;
  overlay = { kind: "failed", total, until: Date.now() + FAILED_HOLD_MS, ...(resume ? { resume } : {}) };
  schedule();
  setTimeout(schedule, FAILED_HOLD_MS + PUBLISH_THROTTLE_MS);
}
