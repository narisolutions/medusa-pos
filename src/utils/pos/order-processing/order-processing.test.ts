import { describe, it, expect, vi } from "vitest";

vi.mock("@/config/medusa", () => ({ getSdk: vi.fn() }));
vi.mock("@/utils/storage", () => ({ default: {} }));
vi.mock("@/utils/logger", () => ({ logger: {}, safeStringify: String }));

import { findOpenCollection, findOutstandingCollection, unfulfilledQuantities } from ".";

describe("findOutstandingCollection", () => {
  const original = { id: "pc_sale", status: "completed", amount: 5 };

  it("finds the unpaid collection the backend created for the difference", () => {
    const topUp = { id: "pc_diff", status: "not_paid", amount: 10 };
    expect(findOutstandingCollection([original, topUp], 10)).toBe(topUp);
  });

  it("never picks the original, already-paid collection", () => {
    expect(findOutstandingCollection([original], 5)).toBeUndefined();
  });

  it("ignores an unpaid collection for a different amount", () => {
    const stale = { id: "pc_stale", status: "not_paid", amount: 3.5 };
    expect(findOutstandingCollection([original, stale], 10)).toBeUndefined();
  });

  it("prefers the newest match and tolerates float noise", () => {
    const older = { id: "pc_old", status: "not_paid", amount: 3.99 };
    const newer = { id: "pc_new", status: "not_paid", amount: 3.9899999 };
    expect(findOutstandingCollection([older, newer], 3.99)).toBe(newer);
  });
});

describe("unfulfilledQuantities", () => {
  it("leaves the order's existing lines alone, even when unfulfilled", () => {
    const items = [
      { id: "awaiting_shipment", quantity: 2, detail: { fulfilled_quantity: 0 } },
      { id: "added", quantity: 1, detail: { fulfilled_quantity: 0 } },
    ];
    expect(unfulfilledQuantities(items, new Set(["awaiting_shipment"]))).toEqual([
      { id: "added", quantity: 1 },
    ]);
  });

  it("returns only what is not yet handed over, per line", () => {
    const items = [
      { id: "sold", quantity: 1, detail: { fulfilled_quantity: 1 } },
      { id: "added", quantity: 2, detail: { fulfilled_quantity: 0 } },
      { id: "partly", quantity: 3, detail: { fulfilled_quantity: 1 } },
      { id: "no_detail", quantity: 1 },
    ];
    expect(unfulfilledQuantities(items)).toEqual([
      { id: "added", quantity: 2 },
      { id: "partly", quantity: 2 },
      { id: "no_detail", quantity: 1 },
    ]);
  });
});

describe("findOpenCollection", () => {
  it("returns a fresh sale's only collection", () => {
    const only = { id: "pc", status: "not_paid" };
    expect(findOpenCollection([only])).toBe(only);
  });

  it("skips the collection an edit canceled in favour of the one it created", () => {
    const canceled = { id: "pc_old", status: "canceled" };
    const fresh = { id: "pc_new", status: "not_paid" };
    expect(findOpenCollection([canceled, fresh])).toBe(fresh);
  });

  it("returns nothing when every collection is canceled", () => {
    expect(findOpenCollection([{ id: "pc", status: "canceled" }])).toBeUndefined();
  });
});
