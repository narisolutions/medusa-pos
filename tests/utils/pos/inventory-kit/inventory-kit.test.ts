import { describe, it, expect } from "vitest";
import { mapKitComponents, type InventoryItemWithVariants } from "@/utils/pos/inventory-kit";

const saperavi: InventoryItemWithVariants = {
  id: "iitem_saperavi",
  stocked_quantity: 12,
  reserved_quantity: 2,
  variants: [
    {
      id: "variant_saperavi",
      title: "Default variant",
      sku: "SAP-750",
      ean: "4860001",
      product: { id: "prod_saperavi", title: "Saperavi 2021", thumbnail: "https://cdn/s.jpg" },
    },
    // The gift box itself also draws from this item.
    { id: "variant_giftbox", title: "Gift box", product: { id: "prod_box", title: "Gift box" } },
  ],
};

const glass: InventoryItemWithVariants = {
  id: "iitem_glass",
  stocked_quantity: 3,
  reserved_quantity: 5,
  variants: [
    { id: "variant_glass", title: "Crystal", product: { id: "prod_glass", title: "Wine glass" } },
    { id: "variant_giftbox", title: "Gift box", product: { id: "prod_box", title: "Gift box" } },
  ],
};

describe("mapKitComponents", () => {
  const components = mapKitComponents(
    [saperavi, glass],
    [
      { inventory_item_id: "iitem_saperavi", required_quantity: 1 },
      { inventory_item_id: "iitem_glass", required_quantity: 2 },
    ]
  );

  it("lists each variant once, even when it draws from several of the kit's items", () => {
    expect(components.map((c) => c.id)).toEqual([
      "variant_saperavi",
      "variant_giftbox",
      "variant_glass",
    ]);
  });

  it("takes stock from the inventory item, never below zero", () => {
    expect(components.find((c) => c.id === "variant_saperavi")?.inventory_quantity).toBe(10);
    expect(components.find((c) => c.id === "variant_glass")?.inventory_quantity).toBe(0);
  });

  it("carries how many of the item one kit takes", () => {
    expect(components.find((c) => c.id === "variant_glass")?.required_quantity).toBe(2);
  });

  it("names a default variant after its product", () => {
    const saperaviRow = components.find((c) => c.id === "variant_saperavi");
    expect(saperaviRow?.title).toBe("Saperavi 2021");
    expect(saperaviRow?.sku).toBe("SAP-750");
    expect(saperaviRow?.product?.thumbnail).toBe("https://cdn/s.jpg");
  });

  it("assumes one per kit when the link carries no quantity", () => {
    expect(mapKitComponents([saperavi])[0].required_quantity).toBe(1);
  });
});
