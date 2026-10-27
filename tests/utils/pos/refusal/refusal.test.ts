import { describe, it, expect } from "vitest";
import {
  cartLines,
  explainRefusal,
  inventoryItemVariants,
  lineName,
  needsLiveStock,
  orderLines,
  refusalMessage,
  type RefusalLine,
} from "@/utils/pos/refusal";

const ulid = (char: string) => char.repeat(26);
const SAPERAVI = `variant_${ulid("A")}`;
const KISI = `variant_${ulid("B")}`;
const GONE = `variant_${ulid("C")}`;
const ITEM_SAPERAVI = `iitem_${ulid("D")}`;

const lines: RefusalLine[] = [
  { variantId: SAPERAVI, title: "Saperavi 750ml", quantity: 5 },
  { variantId: KISI, title: "Kisi Qvevri 750ml", quantity: 2 },
];

describe("lineName", () => {
  it("names the product, and the variant when it tells lines apart", () => {
    expect(lineName({ title: "750/2023", productTitle: "Kindzmarauli", quantity: 1 })).toBe("Kindzmarauli · 750/2023");
    expect(lineName({ title: "Kindzmarauli", productTitle: "Kindzmarauli", quantity: 1 })).toBe("Kindzmarauli");
    expect(lineName({ title: "Kindzmarauli 2023", productTitle: "Kindzmarauli", quantity: 1 })).toBe("Kindzmarauli 2023");
    expect(lineName({ productTitle: "Saperavi", quantity: 1 })).toBe("Saperavi");
    expect(lineName({ title: "Default variant", productTitle: "Kisi", quantity: 1 })).toBe("Kisi");
    expect(lineName({ title: "Default variant", quantity: 1 })).toBe("-");
    expect(lineName({ quantity: 1 })).toBe("-");
  });
});

describe("explainRefusal: lines Medusa refuses by name", () => {
  it("names lines that are no longer for sale, keeping an id it cannot name", () => {
    const message = `Variants ${SAPERAVI}, ${GONE} do not exist or belong to a product that is not published`;
    expect(explainRefusal(message, { lines })).toEqual({
      kind: "not_for_sale",
      names: ["Saperavi 750ml", GONE],
    });
  });

  it("names lines without a price", () => {
    expect(explainRefusal(`Variants with IDs ${KISI} do not have a price`, { lines })).toEqual({
      kind: "no_price",
      names: ["Kisi Qvevri 750ml"],
    });
  });

  it("names a line that has no stock location here", () => {
    const noItems = `Variant ${SAPERAVI} does not have any inventory items associated with it.`;
    const noLocation = `Sales channel sc_01ABC is not associated with any stock location for variant ${KISI}.`;
    expect(explainRefusal(noItems, { lines })).toEqual({ kind: "not_stocked_here", names: ["Saperavi 750ml"] });
    expect(explainRefusal(noLocation, { lines })).toEqual({ kind: "not_stocked_here", names: ["Kisi Qvevri 750ml"] });
  });

  it("is null for any other error", () => {
    expect(explainRefusal("Network request failed", { lines })).toBeNull();
    expect(explainRefusal("", { lines })).toBeNull();
  });
});

describe("explainRefusal: stock", () => {
  const unnamed = "Some variant does not have the required inventory";

  it("finds the lines asking for more than there is, from live stock", () => {
    const availability = new Map([[SAPERAVI, 3], [KISI, 10]]);
    expect(explainRefusal(unnamed, { lines, availability })).toEqual({
      kind: "short_stock",
      lines: [{ name: "Saperavi 750ml", requested: 5, available: 3 }],
    });
  });

  it("treats a variant missing from the live catalogue as out of stock", () => {
    const availability = new Map([[KISI, 10]]);
    expect(explainRefusal(unnamed, { lines, availability })).toEqual({
      kind: "short_stock",
      lines: [{ name: "Saperavi 750ml", requested: 5, available: 0 }],
    });
  });

  it("singles out nothing when stock could not be loaded, or nothing is short now", () => {
    expect(explainRefusal(unnamed, { lines, availability: null })).toEqual({ kind: "short_stock", lines: [] });
    const plenty = new Map([[SAPERAVI, 99], [KISI, 99]]);
    expect(explainRefusal(unnamed, { lines, availability: plenty })).toEqual({ kind: "short_stock", lines: [] });
  });

  it("maps an inventory item id back to its line", () => {
    const message = `Not enough stock available for item ${ITEM_SAPERAVI} at location sloc_01XYZ`;
    const inventoryItemVariant = new Map([[ITEM_SAPERAVI, SAPERAVI]]);
    expect(explainRefusal(message, { lines, availability: new Map([[SAPERAVI, 2]]), inventoryItemVariant })).toEqual({
      kind: "short_stock",
      lines: [{ name: "Saperavi 750ml", requested: 5, available: 2 }],
    });
    // No live numbers: the line is still named.
    expect(explainRefusal(message, { lines, inventoryItemVariant })).toEqual({
      kind: "short_stock",
      lines: [{ name: "Saperavi 750ml", requested: 5, available: null }],
    });
  });

  it("never shows an inventory item id it cannot map", () => {
    const message = `Not enough stock available for item ${ITEM_SAPERAVI} at location sloc_01XYZ`;
    expect(explainRefusal(message, { lines })).toEqual({ kind: "short_stock", lines: [] });
  });
});

describe("needsLiveStock", () => {
  it("is true only for the stock refusals that don't name a line", () => {
    expect(needsLiveStock("Some variant does not have the required inventory")).toBe(true);
    expect(needsLiveStock(`Not enough stock available for item ${ITEM_SAPERAVI} at location sloc_1`)).toBe(true);
    expect(needsLiveStock(`Variants with IDs ${KISI} do not have a price`)).toBe(false);
  });
});

describe("refusalMessage", () => {
  // Echoes the key and its values, so the test sees what each case asks the translations for.
  const t = (key: string, options?: Record<string, unknown>) => `${key} ${JSON.stringify(options ?? {})}`;

  it("lists short lines with their numbers", () => {
    const refusal = {
      kind: "short_stock" as const,
      lines: [
        { name: "Saperavi 750ml", requested: 5, available: 3 },
        { name: "Kisi", requested: 1, available: null },
      ],
    };
    const text = refusalMessage(refusal, t);
    expect(text).toContain("checkout.refusal.short_stock");
    expect(text).toContain("checkout.refusal.short_line");
    expect(text).toContain("Kisi");
  });

  it("falls back to the general sentence when no line can be named", () => {
    expect(refusalMessage({ kind: "short_stock", lines: [] }, t)).toBe("checkout.refusal.short_generic {}");
  });

  it("joins names for the other refusals", () => {
    expect(refusalMessage({ kind: "no_price", names: ["A", "B"] }, t)).toContain('"names":"A, B"');
    expect(refusalMessage({ kind: "not_for_sale", names: ["A", "B"] }, t)).toContain('"count":2');
    expect(refusalMessage({ kind: "not_stocked_here", names: ["A"] }, t)).toContain("not_stocked_here");
  });
});

describe("cartLines and orderLines", () => {
  it("read the product title and a numeric quantity from either shape", () => {
    expect(cartLines([{ variant_id: SAPERAVI, title: "750/2023", quantity: 2, metadata: { product_title: "Saperavi" } }])).toEqual([
      { variantId: SAPERAVI, title: "750/2023", productTitle: "Saperavi", quantity: 2 },
    ]);
    expect(orderLines([{ variant_id: KISI, title: "Default variant", product_title: "Kisi", quantity: "3" }])).toEqual([
      { variantId: KISI, title: "Default variant", productTitle: "Kisi", quantity: 3 },
    ]);
    expect(orderLines(undefined)).toEqual([]);
  });
});

describe("inventoryItemVariants", () => {
  it("maps every inventory item, kit parts included, to the variant that uses it", () => {
    const products = [
      { variants: [{ id: SAPERAVI, inventory_items: [{ inventory_item_id: ITEM_SAPERAVI }] }] },
      { variants: [{ id: KISI, inventory_items: [{ inventory_item_id: "iitem_box" }, { inventory_item_id: "iitem_glass" }] }] },
      { variants: [{ id: GONE, inventory_items: null }] },
    ];
    expect(Object.fromEntries(inventoryItemVariants(products))).toEqual({
      [ITEM_SAPERAVI]: SAPERAVI,
      iitem_box: KISI,
      iitem_glass: KISI,
    });
  });
});
