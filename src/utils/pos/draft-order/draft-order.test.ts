import { describe, it, expect } from "vitest";
import { AdminDraftOrder, AdminProductVariant } from "@medusajs/types";
import {
  mapDraftOrderItemsToCartItems,
  sanitizeDraftOrderMetadata,
  buildCartMetadataFromDraft,
  reconcileStock,
} from ".";
import { buildItemMetadata } from "@/utils/pos/cart";
import { CartItem } from "@/types/utils";

/** A kit variant carrying every metadata key the cart can produce. */
const variant = {
  id: "variant_01",
  title: "Tsinandali 2019",
  sku: "wine-tsinandali-2019",
  ean: "4820024790017",
  inventory_quantity: 6,
  product: { title: "Tsinandali", thumbnail: "https://cdn/x.jpg" },
  options: [{ id: "opt_01", value: "0.75L", option_id: "o_vol" }],
  calculated_price: {
    calculated_amount: 40,
    original_amount: 50,
    calculated_price: { price_list_type: "sale" },
  },
  inventory_items: [
    { inventory_item_id: "iitem_01" },
    { inventory_item_id: "iitem_02" },
  ],
} as unknown as AdminProductVariant;

/** Round-trips a cart item through the shape the draft-order API stores and returns. */
const roundTrip = (item: CartItem): CartItem => {
  const draft = {
    items: [
      {
        id: "ordli_01",
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        title: item.title,
        variant_title: item.title,
        metadata: item.metadata,
      },
    ],
  } as unknown as AdminDraftOrder;

  return mapDraftOrderItemsToCartItems(draft)[0];
};

describe("item metadata round trip", () => {
  // The contract in docs/draft-orders/04-state-and-persistence.md. An allowlist here has
  // already silently dropped three of these keys once — this test is what stops it.
  it("preserves every key buildItemMetadata writes", () => {
    const metadata = buildItemMetadata(variant) as Record<string, unknown>;
    metadata.original_unit_price = 50;
    metadata.item_discount = { type: "amount", value: 10 };
    metadata.comment = "gift wrap";

    const item: CartItem = {
      variant_id: "variant_01",
      quantity: 2,
      unit_price: 40,
      title: "Tsinandali 2019",
      metadata,
    };

    expect(roundTrip(item).metadata).toEqual(metadata);
  });

  it("keeps the keys a whitelist is most likely to drop", () => {
    const metadata = buildItemMetadata(variant) as Record<string, unknown>;
    metadata.original_unit_price = 50;

    const result = roundTrip({
      variant_id: "variant_01",
      quantity: 1,
      unit_price: 40,
      title: "Tsinandali 2019",
      metadata,
    }).metadata as Record<string, unknown>;

    expect(result.options).toEqual(variant.options);
    expect(result.original_unit_price).toBe(50);
    expect(result.inventory_item_ids).toEqual(["iitem_01", "iitem_02"]);
  });

  it("falls back through title, variant_title, then product_title", () => {
    const draft = {
      items: [
        { variant_id: "v1", quantity: 1, unit_price: 1, metadata: { product_title: "Fallback" } },
      ],
    } as unknown as AdminDraftOrder;

    expect(mapDraftOrderItemsToCartItems(draft)[0].title).toBe("Fallback");
  });
});

describe("sanitizeDraftOrderMetadata", () => {
  it("preserves metadata written by other parts of the app", () => {
    // cash_paid and register_session_id are written at payment time. Rebuilding the
    // object from a fixed allowlist would erase them on the next sync.
    const result = sanitizeDraftOrderMetadata(
      { order_comment: "ring twice" },
      {
        removeEmpty: true,
        preserve: { cash_paid: 50, register_session_id: "sess_01", pay_later: true },
      }
    );

    expect(result).toEqual({
      order_comment: "ring twice",
      cash_paid: 50,
      register_session_id: "sess_01",
      pay_later: true,
    });
  });

  it("lets a local POS-owned key win over the stored one", () => {
    const result = sanitizeDraftOrderMetadata(
      { park_label: "Table 5" },
      { removeEmpty: true, preserve: { park_label: "Table 4", cash_paid: 20 } }
    );

    expect(result.park_label).toBe("Table 5");
    expect(result.cash_paid).toBe(20);
  });

  it("drops empty POS-owned values when writing", () => {
    const result = sanitizeDraftOrderMetadata(
      { order_comment: "   ", order_discount: null, park_label: "" },
      { removeEmpty: true }
    );

    expect(result).toEqual({});
  });

  it("removes a cleared park label rather than keeping the stored one", () => {
    // "Park without a name" on an already-named sale must actually drop the name;
    // park_label is POS-owned, so `preserve` must not resurrect it.
    const result = sanitizeDraftOrderMetadata(
      { park_label: undefined },
      { removeEmpty: true, preserve: { park_label: "Table 4", cash_paid: 20 } }
    );

    expect(result).not.toHaveProperty("park_label");
    expect(result.cash_paid).toBe(20);
  });

  it("fills defaults when reading", () => {
    const result = sanitizeDraftOrderMetadata({});

    expect(result.order_discount).toBeNull();
    expect(result.order_comment).toBe("");
    expect(result).not.toHaveProperty("park_label");
  });
});

describe("payment method round trip", () => {
  const draftWith = (metadata: Record<string, unknown>) =>
    ({ metadata, items: [] }) as unknown as AdminDraftOrder;

  it("restores the parked selection", () => {
    const result = buildCartMetadataFromDraft(
      draftWith({ payment_method: "pp_tbc" }),
      undefined,
      ["pp_cash_pos", "pp_tbc"]
    );

    expect(result.payment_method).toBe("pp_tbc");
  });

  it("drops a provider this till does not offer", () => {
    // Parked at a till with a card terminal, resumed at one without: keeping the
    // selection would satisfy the payment guard while no button appears selected.
    const result = buildCartMetadataFromDraft(
      draftWith({ payment_method: "pp_tbc" }),
      undefined,
      ["pp_cash_pos"]
    );

    expect(result.payment_method).toBeUndefined();
  });

  it("matches provider ids case-insensitively", () => {
    const result = buildCartMetadataFromDraft(
      draftWith({ payment_method: "PP_TBC" }),
      undefined,
      ["pp_tbc"]
    );

    expect(result.payment_method).toBe("PP_TBC");
  });

  it("writes the selection so it survives the park", () => {
    const written = sanitizeDraftOrderMetadata(
      { payment_method: "pp_tbc", order_comment: "ring twice" },
      { removeEmpty: true }
    );

    expect(written.payment_method).toBe("pp_tbc");
  });
});

describe("reconcileStock", () => {
  const item = (variantId: string, quantity: number): CartItem => ({
    variant_id: variantId,
    quantity,
    unit_price: 10,
    title: variantId,
    metadata: { available_quantity: 99 },
  });

  it("overwrites the stale snapshot rather than trusting it", () => {
    const { items } = reconcileStock([item("v1", 1)], new Map([["v1", 3]]));

    expect(items[0].metadata?.available_quantity).toBe(3);
  });

  it("classifies reduced and unavailable without clamping quantities", () => {
    const { items, warnings } = reconcileStock(
      [item("v1", 5), item("v2", 1), item("v3", 2)],
      new Map([
        ["v1", 1],
        ["v2", 4],
        ["v3", 0],
      ])
    );

    expect(warnings).toEqual([
      { variantId: "v1", title: "v1", requested: 5, available: 1, status: "reduced" },
      { variantId: "v3", title: "v3", requested: 2, available: 0, status: "unavailable" },
    ]);
    expect(items.map((i) => i.quantity)).toEqual([5, 1, 2]);
  });

  it("treats a variant missing from the catalogue as unavailable", () => {
    const { warnings } = reconcileStock([item("gone", 1)], new Map());

    expect(warnings[0].status).toBe("unavailable");
  });
});
