import { describe, expect, it } from "vitest";
import { changedLineKey, isStale, receiveState, STALE_AFTER_MS } from "@/utils/customer-display/receive";

const acceptState = (current: Parameters<typeof receiveState>[0], payload: unknown) => {
  const received = receiveState(current, payload);
  return "state" in received ? received.state : null;
};

const envelope = (seq: number) => ({
  v: 1,
  seq,
  sentAt: 0,
  phase: "idle",
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
});

const line = (key: string, quantity: number) => ({ key, title: key, quantity, unitPrice: 1, lineTotal: quantity });

describe("acceptState", () => {
  it("takes a newer screen and ignores an older one", () => {
    const shown = acceptState(null, envelope(5))!;
    expect(acceptState(shown, envelope(6))?.seq).toBe(6);
    expect(acceptState(shown, envelope(4))).toBeNull();
    expect(acceptState(shown, envelope(5))).toBeNull();
  });

  it("starts over when the till restarted and counts from 1 again", () => {
    expect(acceptState(acceptState(null, envelope(40)), envelope(1))?.seq).toBe(1);
  });

  it("refuses anything malformed or from another version", () => {
    expect(acceptState(null, { ...envelope(1), v: 2 })).toBeNull();
    expect(acceptState(null, { ...envelope(1), phase: "cart" })).toBeNull();
    expect(acceptState(null, "hello")).toBeNull();
  });

  it("says why a screen was refused, so the display can log it", () => {
    const cart = { ...envelope(2), phase: "cart", lines: [{ ...line("a", 1), quantity: 0 }], totals: {} };
    const received = receiveState(null, cart);
    expect(received).toMatchObject({ ignored: "invalid" });
    expect("reason" in received && received.reason).toContain("lines.0.quantity");
    expect(receiveState(acceptState(null, envelope(5)), envelope(4))).toEqual({ ignored: "older" });
  });

  it("takes a weighed quantity", () => {
    const totals = { itemCount: 0.35, subtotal: 14, discount: 0, total: 14, hiddenLines: 0 };
    const cart = { ...envelope(2), phase: "cart", lines: [line("a", 0.35)], totals };
    expect(acceptState(null, cart)).toMatchObject({ lines: [{ quantity: 0.35 }] });
  });

  it("drops fields the contract doesn't name", () => {
    expect(acceptState(null, { ...envelope(1), customer: "someone@example.com" })).not.toHaveProperty("customer");
  });
});

describe("changedLineKey", () => {
  it("points at a new line, or at one whose quantity changed", () => {
    expect(changedLineKey(undefined, [line("a", 1)])).toBe("a");
    expect(changedLineKey([line("a", 1)], [line("a", 1), line("b", 1)])).toBe("b");
    expect(changedLineKey([line("a", 1), line("b", 1)], [line("a", 2), line("b", 1)])).toBe("a");
    expect(changedLineKey([line("a", 1)], [line("a", 1)])).toBeUndefined();
  });
});

describe("isStale", () => {
  it("is stale after three missed heartbeats", () => {
    expect(isStale(0, STALE_AFTER_MS)).toBe(false);
    expect(isStale(0, STALE_AFTER_MS + 1)).toBe(true);
  });
});
