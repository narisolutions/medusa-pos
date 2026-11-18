import { describe, expect, it } from "vitest";
import { changedLineKey, isStale, receiveState, STALE_AFTER_MS } from "@/utils/customer-display/receive";
import { MAX_LOGO_CHARS } from "@/utils/schemas/customer-display";

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

  it("takes the logo as an address or as the picture the store settings save, within a size limit", () => {
    const withLogo = (logoUrl: string) => acceptState(null, { ...envelope(1), logoUrl });
    expect(withLogo("https://cdn.example.com/logo.png")).toMatchObject({ logoUrl: "https://cdn.example.com/logo.png" });
    expect(withLogo("data:image/png;base64,iVBORw0KGgo=")).toMatchObject({ phase: "idle" });
    expect(withLogo("data:image/svg+xml;base64,PHN2Zz4=")).toMatchObject({ phase: "idle" });
    expect(withLogo("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(withLogo("javascript:alert(1)")).toBeNull();
    expect(withLogo(`data:image/png;base64,${"A".repeat(MAX_LOGO_CHARS)}`)).toBeNull();
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
