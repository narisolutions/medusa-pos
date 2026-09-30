import { describe, it, expect, vi } from "vitest";

vi.mock("@/config/medusa", () => ({ getSdk: vi.fn() }));
vi.mock("@/utils/storage", () => ({ default: {} }));
vi.mock("@/utils/logger", () => ({ logger: {}, safeStringify: String }));

import { findOutstandingCollection } from ".";

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
