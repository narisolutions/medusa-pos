import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureCustomerDisplayPublisher,
  HEARTBEAT_MS,
  PUBLISH_THROTTLE_MS,
  setDisplayPayment,
  showDisplayFailure,
  showDisplaySuccess,
  startCustomerDisplayPublisher,
  stopCustomerDisplayPublisher,
  type PublisherConfig,
} from "@/utils/customer-display/publisher";
import { displayStateSchema } from "@/utils/schemas/customer-display";
import type { DisplayState } from "@/types/customer-display";
import type { CartItem } from "@/types/utils";
import { pricesIncludeVat } from "@/utils/customer-display/vat";

const config: PublisherConfig = {
  branding: { storeName: "Wineland" },
  format: {
    currency: "GEL",
    symbolPosition: "before",
    decimalSeparator: "dot",
    language: "ka",
    theme: "light",
    pricesIncludeVat: false,
    showImages: true,
  },
  thanksMs: 8_000,
};

function setup() {
  let items: CartItem[] = [];
  const listeners = new Set<() => void>();
  const sent: DisplayState[] = [];
  let hello: () => void = () => undefined;
  const cart = {
    getItems: () => items,
    getTotals: () => ({
      itemCount: items.reduce((sum, entry) => sum + entry.quantity, 0),
      subtotal: items.reduce((sum, entry) => sum + (entry.unit_price ?? 0) * entry.quantity, 0),
      discount: 0,
      total: items.reduce((sum, entry) => sum + (entry.unit_price ?? 0) * entry.quantity, 0),
    }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const transport = {
    send: (state: DisplayState) => void sent.push(state),
    onHello: async (callback: () => void) => {
      hello = callback;
      return () => undefined;
    },
  };
  const setItems = (next: CartItem[]) => {
    items = next;
    listeners.forEach((listener) => listener());
  };
  const stop = startCustomerDisplayPublisher(transport, cart, config);
  return { sent, setItems, stop, hello: () => hello(), last: () => sent[sent.length - 1] };
}

const line = (n: number): CartItem => ({ variant_id: `v${n}`, title: `Wine ${n}`, quantity: 1, unit_price: 10 });

describe("customer display publisher", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    stopCustomerDisplayPublisher();
    vi.useRealTimers();
  });

  it("sends the current screen at once, valid against the contract", () => {
    const { sent } = setup();
    expect(sent).toHaveLength(1);
    expect(displayStateSchema.safeParse(sent[0]).success).toBe(true);
    expect(sent[0]).toMatchObject({ v: 1, phase: "idle" });
  });

  it("sends one screen for a burst of scans", () => {
    const { sent, setItems, last } = setup();
    for (let n = 1; n <= 20; n++) setItems(Array.from({ length: n }, (_, i) => line(i)));
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(sent).toHaveLength(2);
    expect(last()).toMatchObject({ phase: "cart", seq: sent[0].seq + 1, totals: { itemCount: 20 } });
  });

  it("resends as a heartbeat and answers a display that says hello", () => {
    const { sent, hello } = setup();
    vi.advanceTimersByTime(HEARTBEAT_MS);
    expect(sent).toHaveLength(2);
    hello();
    const first = sent[0].seq;
    // Only ever up, for the whole run: a restarted publisher must not look older to the display.
    expect(sent.map((state) => state.seq)).toEqual([first, first + 1, first + 2]);
  });

  it("goes from payment to thank-you to welcome, as the till clears the cart", () => {
    const { setItems, last } = setup();
    setItems([line(1)]);
    setDisplayPayment({ method: "cash", amountDue: 10, tendered: 20, change: 10 });
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "payment_pending", amountDue: 10, change: 10 });

    setItems([]);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "payment_pending", lines: [{ key: "v1" }] });

    showDisplaySuccess({ total: 10, change: 10, outstanding: false });
    setDisplayPayment(null);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "payment_success", change: 10 });

    vi.advanceTimersByTime(config.thanksMs + PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "idle" });
  });

  it.each<[string, number | undefined, boolean]>([
    ["a store with an 18% rate", 18, true],
    ["a store with no VAT", 0, false],
    ["the rate not loaded yet", undefined, false],
  ])("tells the cart screen whether prices include VAT: %s", (_name, known, expected) => {
    const { setItems, last } = setup();
    configureCustomerDisplayPublisher({ ...config, format: { ...config.format, pricesIncludeVat: pricesIncludeVat(known) } });
    setItems([line(1)]);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "cart", format: { pricesIncludeVat: expected } });
    expect(last()).not.toHaveProperty("totals.vatIncluded");
  });

  it("does not bring thank-you back when a wrong scan is removed", () => {
    const { setItems, last } = setup();
    showDisplaySuccess({ total: 10, change: 5, outstanding: false });
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "payment_success" });

    setItems([line(1)]);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "cart" });

    setItems([]);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "idle" });
  });

  it("sends only what the contract names, and refuses to send a screen that breaks it", () => {
    const { setItems, last, sent } = setup();
    setItems([{ ...line(1), internal_note: "staff only", metadata: { variant_sku: "SKU-1", comment: "note" } }]);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(JSON.stringify(last())).not.toMatch(/staff only|SKU-1|note/);

    const count = sent.length;
    setDisplayPayment({ method: "cash", amountDue: Number.NaN });
    expect(() => vi.advanceTimersByTime(PUBLISH_THROTTLE_MS)).toThrow(/breaks its contract: amountDue/);
    expect(sent).toHaveLength(count);
  });

  it("shows a failure, then returns to the payment still open", () => {
    const { setItems, last } = setup();
    setItems([line(1)]);
    setDisplayPayment({ method: "card", amountDue: 10 });
    showDisplayFailure(10);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(last()).toMatchObject({ phase: "payment_failed", total: 10 });

    vi.advanceTimersByTime(10_000);
    expect(last()).toMatchObject({ phase: "payment_pending", method: "card" });
  });

  it("does nothing once stopped, and an old stop leaves a newer publisher running", () => {
    const first = setup();
    const second = setup();
    first.stop();
    second.setItems([line(1)]);
    vi.advanceTimersByTime(PUBLISH_THROTTLE_MS);
    expect(second.last()).toMatchObject({ phase: "cart" });

    stopCustomerDisplayPublisher();
    const count = second.sent.length;
    second.setItems([line(2)]);
    vi.advanceTimersByTime(HEARTBEAT_MS * 2);
    expect(second.sent).toHaveLength(count);
  });
});
