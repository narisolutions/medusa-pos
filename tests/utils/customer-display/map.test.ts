import { describe, expect, it } from "vitest";
import { buildScreen, cartView, MAX_DISPLAY_LINES, settleOverlay, type CartTotals } from "@/utils/customer-display/map";
import { cartTotals } from "@/utils/customer-display/cart-totals";
import { createCartCalculationsSlice } from "@/context/cart/slices/calculations.slice";
import { displayLineSchema, displayTotalsSchema } from "@/utils/schemas/customer-display";
import type { CartItem } from "@/types/utils";

const item = (overrides: Partial<CartItem> & { metadata?: Record<string, unknown> } = {}): CartItem => ({
  variant_id: "var_1",
  title: "Saperavi",
  quantity: 2,
  unit_price: 28,
  ...overrides,
  metadata: {
    product_title: "Saperavi",
    variant_sku: "SKU-SECRET",
    barcode: "4860000000017",
    ean: "4860000000017",
    available_quantity: 7,
    inventory_item_ids: ["iitem_1"],
    comment: "staff-only note",
    thumbnail: "https://cdn.example.com/saperavi.jpg",
    options: [{ value: "2019", option: { title: "Vintage" } }, { value: "750", option: { title: "Volume" } }],
    ...overrides.metadata,
  },
});

/** The till's real getters over these items, as the cart store wires them. */
function tillTotals(items: CartItem[]): CartTotals {
  type Slice = ReturnType<typeof createCartCalculationsSlice>;
  const state = { items, metadata: {} };
  const getters: Slice = createCartCalculationsSlice(
    () => undefined,
    (): Slice & typeof state => ({ ...state, ...getters }),
    {} as never
  );
  return cartTotals(getters);
}

const view = (items: CartItem[], showImages = true) => cartView(items, tillTotals(items), { showImages, currency: "GEL" });

describe("cartView", () => {
  it("sends only the allowlisted fields: no SKU, barcode, stock, inventory or comment", () => {
    const internal = item({ internal_note: "internal-note" });
    const json = JSON.stringify(view([internal]));
    for (const secret of ["SKU-SECRET", "4860000000017", "iitem_1", "staff-only note", "available_quantity", "internal-note"]) {
      expect(json).not.toContain(secret);
    }
    expect(view([internal])).toEqual({
      lines: [
        {
          key: "var_1",
          title: "Saperavi",
          subtitle: "2019/750",
          quantity: 2,
          unitPrice: 28,
          lineTotal: 56,
          thumbnailUrl: "https://cdn.example.com/saperavi.jpg",
        },
      ],
      totals: { itemCount: 2, subtotal: 56, discount: 0, total: 56, hiddenLines: 0 },
    });
  });

  it("drops photos when they are switched off, and any that isn't a real https address", () => {
    expect(view([item()], false).lines[0].thumbnailUrl).toBeUndefined();
    for (const thumbnail of ["http://insecure/x.jpg", "https://", "https:// bad", "javascript:alert(1)", 42, null]) {
      expect(view([item({ metadata: { thumbnail } })]).lines[0].thumbnailUrl).toBeUndefined();
    }
  });

  it("shows a manual discount with the price before it", () => {
    const discounted = item({
      unit_price: 18,
      quantity: 1,
      metadata: { original_price: 20, original_unit_price: 20, item_discount: { type: "percent", value: 10 } },
    });
    expect(view([discounted]).lines[0]).toMatchObject({ unitPrice: 18, originalUnitPrice: 20, discountLabel: "−10%" });
  });

  it("shows a price-list sale as a struck-through price without a label", () => {
    const { lines } = view([item({ unit_price: 25, quantity: 1, metadata: { original_price: 30 } })]);
    expect(lines[0].originalUnitPrice).toBe(30);
    expect(lines[0].discountLabel).toBeUndefined();
  });

  it("keeps the newest lines of a very long cart and still counts them all", () => {
    const items = Array.from({ length: MAX_DISPLAY_LINES + 3 }, (_, i) => item({ variant_id: `v${i}`, quantity: 1 }));
    const { lines, totals } = view(items);
    expect(lines).toHaveLength(MAX_DISPLAY_LINES);
    expect(lines[lines.length - 1].key).toBe(`v${MAX_DISPLAY_LINES + 2}`);
    expect(totals).toMatchObject({ itemCount: MAX_DISPLAY_LINES + 3, hiddenLines: 3, total: 28 * (MAX_DISPLAY_LINES + 3) });
  });
});

describe("totals are the till's own", () => {
  const carts: Record<string, CartItem[]> = {
    plain: [item(), item({ variant_id: "var_2", quantity: 3, unit_price: 9.99 })],
    "price-list sale": [item({ unit_price: 25, metadata: { original_price: 30 } })],
    "manual discount": [item({ unit_price: 18, metadata: { original_price: 20, original_unit_price: 20 } })],
    "manual discount on a sale price": [item({ unit_price: 22.5, metadata: { original_price: 30, original_unit_price: 25 } })],
    // No list price on record: the till's subtotal and saving follow their own rules, and so must the display.
    "manual discount, no original price": [item({ unit_price: 18, metadata: { original_price: undefined, original_unit_price: 20 } })],
    "weighed item": [item({ quantity: 0.35, unit_price: 40 })],
    empty: [],
  };

  it.each(Object.entries(carts))("%s", (_name, items) => {
    const till = tillTotals(items);
    const { totals } = view(items);
    expect({ itemCount: totals.itemCount, subtotal: totals.subtotal, discount: totals.discount, total: totals.total }).toEqual(till);
  });

  it("does no sums of its own: whatever the till says is what is shown", () => {
    const odd = { itemCount: 7, subtotal: 123.45, discount: 6.78, total: 99.99 };
    expect(cartView([item()], odd, { showImages: true, currency: "GEL" }).totals).toEqual({ ...odd, hiddenLines: 0 });
  });
});

describe("whatever the cart holds, the output passes the contract", () => {
  const odd: CartItem[] = [
    item({ quantity: 0.35 }),
    item({ quantity: 1.5, unit_price: 0 }),
    item({ title: "x".repeat(500), metadata: { options: [{ value: "y".repeat(500), option: { title: "Size" } }] } }),
    item({ title: "", metadata: { product_title: undefined } }),
    item({ unit_price: null }),
    item({ unit_price: Number.NaN }),
    item({ metadata: { thumbnail: "https://" } }),
    item({ metadata: { thumbnail: "https://cdn.example.com/a b.jpg" } }),
    item({ metadata: { item_discount: { type: "amount", value: 1e15 } } }),
    item({ metadata: { item_discount: { type: "percent", value: Number.NaN } } }),
    item({ metadata: { original_price: "20", original_unit_price: Number.POSITIVE_INFINITY, options: "none" } }),
    item({ quantity: 0 }),
    item({ quantity: -1 }),
    item({ quantity: Number.NaN }),
    item({ variant_id: undefined }),
  ];

  it.each(odd.map((entry, index) => [index, entry] as const))("odd line %i", (_index, entry) => {
    const { lines, totals } = view([entry]);
    for (const line of lines) expect(displayLineSchema.safeParse(line).error?.issues ?? []).toEqual([]);
    expect(displayTotalsSchema.safeParse(totals).error?.issues ?? []).toEqual([]);
  });

  it("leaves out a line with nothing to sell, not the whole screen", () => {
    expect(view([item({ quantity: 0 }), item({ variant_id: "var_2" })]).lines.map((line) => line.key)).toEqual(["var_2"]);
  });

  it("shows a weighed quantity as it is", () => {
    expect(view([item({ quantity: 0.35, unit_price: 40 })]).lines[0]).toMatchObject({ quantity: 0.35, lineTotal: 14 });
  });
});

describe("settleOverlay", () => {
  const success = { kind: "success" as const, total: 56, change: 4, outstanding: false, until: 1000 };
  const payment = { kind: "payment" as const, cart: view([item()]), method: "card" as const };

  it("keeps thank-you until its time is up", () => {
    expect(settleOverlay(success, true, 500)).toBe(success);
    expect(settleOverlay(success, true, 1000)).toBeNull();
  });

  it("ends thank-you for good when the next sale starts, so it can't come back", () => {
    const afterScan = settleOverlay(success, false, 500);
    expect(afterScan).toBeNull();
    // The wrong item is removed again, still within the thank-you time.
    expect(buildScreen(view([]), settleOverlay(afterScan, true, 600))).toEqual({ phase: "idle" });
  });

  it("returns a failure to the payment still open, or to nothing", () => {
    const failed = { kind: "failed" as const, total: 10, until: 1000 };
    expect(settleOverlay({ ...failed, resume: payment }, false, 500)).toMatchObject({ kind: "failed" });
    expect(settleOverlay({ ...failed, resume: payment }, false, 1000)).toBe(payment);
    expect(settleOverlay(failed, false, 1000)).toBeNull();
  });
});

describe("buildScreen", () => {
  const cart = view([item()]);
  const empty = view([]);

  it("is the welcome screen for an empty cart and the cart otherwise", () => {
    expect(buildScreen(empty, null)).toEqual({ phase: "idle" });
    expect(buildScreen(cart, null)).toMatchObject({ phase: "cart", totals: { total: 56 } });
  });

  it("keeps the cart from when payment began, after the till has cleared it", () => {
    const overlay = { kind: "payment" as const, cart, method: "cash" as const, total: 56, amountDue: 56, tendered: 60, change: 4 };
    expect(buildScreen(empty, overlay)).toMatchObject({
      phase: "payment_pending",
      lines: cart.lines,
      amountDue: 56,
      tendered: 60,
      change: 4,
    });
  });

  it("uses the cart total until the backend has priced the sale, then the backend's", () => {
    expect(buildScreen(cart, { kind: "payment", cart, method: "card" })).toMatchObject({ amountDue: 56, totals: { total: 56 } });
    expect(buildScreen(cart, { kind: "payment", cart, method: "cash", total: 55.98, amountDue: 56 })).toMatchObject({
      amountDue: 56,
      totals: { total: 55.98 },
    });
  });

  it("shows VAT only as an amount the backend charged", () => {
    const withVat = buildScreen(cart, { kind: "payment", cart, method: "card", total: 56, vatIncluded: 8.54 });
    expect(withVat).toMatchObject({ totals: { vatIncluded: 8.54 } });
    const none = buildScreen(cart, { kind: "payment", cart, method: "card", total: 56, vatIncluded: 0 });
    expect(none).not.toHaveProperty("totals.vatIncluded");
  });

  it("shows thank-you with the change", () => {
    const success = { kind: "success" as const, total: 56, change: 4, outstanding: false, until: 1000 };
    expect(buildScreen(empty, success)).toEqual({ phase: "payment_success", total: 56, change: 4, outstanding: false });
  });
});
