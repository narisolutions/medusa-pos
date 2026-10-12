import { describe, it, expect } from "vitest";
import { AdminProduct, AdminStore } from "@medusajs/types";
import { quickKeyLabel, resolveQuickKeys } from "@/utils/pos/quick-keys";
import { buildStoreMetadataPayload, getQuickKeys, MAX_QUICK_KEYS } from "@/utils/settings/store/metadata";

const product = (id: string, title: string, variants: Array<{ id: string; title?: string; sku?: string }>) =>
  ({ id, title, variants }) as unknown as AdminProduct;

const products = [
  product("p1", "Saperavi", [{ id: "v1", title: "Default variant" }]),
  product("p2", "Bag", [
    { id: "v2", title: "Small" },
    { id: "v3", title: "Large" },
  ]),
];

describe("resolveQuickKeys", () => {
  it("keeps the store's order and attaches the product", () => {
    const resolved = resolveQuickKeys([{ variant_id: "v3" }, { variant_id: "v1" }], products);
    expect(resolved.map((r) => r.variant.id)).toEqual(["v3", "v1"]);
    expect(resolved[0].variant.product.id).toBe("p2");
  });

  it("leaves out a key whose variant isn't loaded here", () => {
    expect(resolveQuickKeys([{ variant_id: "gone" }, { variant_id: "v2" }], products)).toHaveLength(1);
  });
});

describe("quickKeyLabel", () => {
  const [{ variant: saperavi }] = resolveQuickKeys([{ variant_id: "v1" }], products);
  const [{ variant: largeBag }] = resolveQuickKeys([{ variant_id: "v3" }], products);

  it("prefers the key's own label", () => {
    expect(quickKeyLabel({ variant_id: "v1", label: " Wine " }, saperavi)).toBe("Wine");
  });

  it("falls back to the product name, adding a real variant name", () => {
    expect(quickKeyLabel({ variant_id: "v1" }, saperavi)).toBe("Saperavi");
    expect(quickKeyLabel({ variant_id: "v3", label: "  " }, largeBag)).toBe("Bag · Large");
  });
});

describe("getQuickKeys", () => {
  const store = (keys: unknown) => ({ metadata: { pos: { quick_keys: keys } } }) as unknown as AdminStore;

  it("drops malformed keys and caps the count", () => {
    const many = Array.from({ length: MAX_QUICK_KEYS + 3 }, (_, i) => ({ variant_id: `v${i}` }));
    expect(getQuickKeys(store(many))).toHaveLength(MAX_QUICK_KEYS);
    expect(getQuickKeys(store([{ variant_id: "" }, null, { label: "x" }, { variant_id: "v1" }]))).toEqual([
      { variant_id: "v1" },
    ]);
    expect(getQuickKeys(store(undefined))).toEqual([]);
  });
});

describe("buildStoreMetadataPayload", () => {
  it("keeps settings another screen owns when saving some", () => {
    const saved = { pos: { brand_name: "Wineland", quick_keys: [{ variant_id: "v1" }] }, other: 1 };
    expect(buildStoreMetadataPayload(saved, { brand_name: "New" })).toEqual({
      other: 1,
      pos: { brand_name: "New", quick_keys: [{ variant_id: "v1" }] },
    });
    expect(buildStoreMetadataPayload(saved, { quick_keys: [] }).pos).toEqual({ brand_name: "Wineland", quick_keys: [] });
  });
});
