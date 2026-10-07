import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdminDraftOrder } from "@medusajs/types";
import type { CartItem } from "@/types/utils";

const sdk = vi.hoisted(() => ({
  admin: {
    order: { listChanges: vi.fn() },
    draftOrder: { beginEdit: vi.fn() },
    customer: { list: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/config/medusa", () => ({ getSdk: () => sdk }));
vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn() }, safeStringify: String }));

import {
  beginEditIfNeeded,
  diffDraftItems,
  metadataUpdate,
  resolveCustomerIdByEmail,
  stableStringify,
} from "@/utils/pos/draft-order/sync";

type DraftLine = NonNullable<AdminDraftOrder["items"]>[number];

const line = (id: string, variant_id: string, quantity: number, extra: Partial<DraftLine> = {}) =>
  ({ id, variant_id, quantity, unit_price: 10, metadata: {}, ...extra }) as DraftLine;

const item = (variant_id: string, quantity: number, extra: Partial<CartItem> = {}) =>
  ({ variant_id, quantity, unit_price: 10, metadata: {}, ...extra }) as CartItem;

beforeEach(() => vi.clearAllMocks());

describe("diffDraftItems", () => {
  it("adds what the draft lacks, removes what the cart dropped, keeps the rest", () => {
    const diff = diffDraftItems(
      [line("li_a", "v_a", 1), line("li_b", "v_b", 2)],
      [item("v_a", 1), item("v_c", 3)]
    );
    expect(diff.add.map((i) => i.variant_id)).toEqual(["v_c"]);
    expect(diff.remove).toEqual(["li_b"]);
    expect(diff.update).toEqual([]);
  });

  it("updates a line whose quantity, price or metadata moved", () => {
    const diff = diffDraftItems(
      [line("li_q", "v_q", 1), line("li_p", "v_p", 1), line("li_m", "v_m", 1)],
      [
        item("v_q", 4),
        item("v_p", 1, { unit_price: 8 }),
        item("v_m", 1, { metadata: { comment: "gift wrap" } }),
      ]
    );
    expect(diff.update).toEqual([
      { id: "li_q", quantity: 4, unit_price: 10, metadata: {} },
      { id: "li_p", quantity: 1, unit_price: 8, metadata: {} },
      { id: "li_m", quantity: 1, unit_price: 10, metadata: { comment: "gift wrap" } },
    ]);
  });

  it("does not mistake reordered metadata keys for a change", () => {
    const diff = diffDraftItems(
      [line("li_a", "v_a", 1, { metadata: { a: 1, b: 2 } })],
      [item("v_a", 1, { metadata: { b: 2, a: 1 } })]
    );
    expect(diff.update).toEqual([]);
  });
});

describe("stableStringify", () => {
  it("is the same for nested objects in any key order", () => {
    expect(stableStringify({ x: { b: 1, a: 2 }, y: [1, 2] })).toBe(
      stableStringify({ y: [1, 2], x: { a: 2, b: 1 } })
    );
  });
});

describe("metadataUpdate", () => {
  it("sends a removed key as an empty string, the only way Medusa deletes it", () => {
    expect(
      metadataUpdate({ park_label: "Table 1", cash_paid: 50 }, { cash_paid: 50 })
    ).toEqual({ park_label: "", cash_paid: 50 });
  });

  it("sends new and changed keys as they are", () => {
    expect(metadataUpdate({ order_comment: "a" }, { order_comment: "b", park_label: "Bar" })).toEqual({
      order_comment: "b",
      park_label: "Bar",
    });
  });

  it("handles a draft with no metadata yet", () => {
    expect(metadataUpdate(null, { park_label: "Bar" })).toEqual({ park_label: "Bar" });
  });
});

describe("beginEditIfNeeded", () => {
  it("opens an edit when none is pending", async () => {
    sdk.admin.order.listChanges.mockResolvedValue({ order_changes: [{ status: "confirmed" }] });
    await beginEditIfNeeded("draft_1");
    expect(sdk.admin.draftOrder.beginEdit).toHaveBeenCalledWith("draft_1");
  });

  it("reuses a pending edit", async () => {
    sdk.admin.order.listChanges.mockResolvedValue({ order_changes: [{ status: "pending" }] });
    await beginEditIfNeeded("draft_1");
    expect(sdk.admin.draftOrder.beginEdit).not.toHaveBeenCalled();
  });
});

describe("resolveCustomerIdByEmail", () => {
  it("returns the existing customer for the email", async () => {
    sdk.admin.customer.list.mockResolvedValue({ customers: [{ id: "cus_guest" }] });
    await expect(resolveCustomerIdByEmail("guest@shop.ge")).resolves.toBe("cus_guest");
    expect(sdk.admin.customer.create).not.toHaveBeenCalled();
  });

  it("creates one when none exists, as Medusa does for a new draft", async () => {
    sdk.admin.customer.list.mockResolvedValue({ customers: [] });
    sdk.admin.customer.create.mockResolvedValue({ customer: { id: "cus_new" } });
    await expect(resolveCustomerIdByEmail("guest@shop.ge")).resolves.toBe("cus_new");
    expect(sdk.admin.customer.create).toHaveBeenCalledWith({ email: "guest@shop.ge" });
  });
});
