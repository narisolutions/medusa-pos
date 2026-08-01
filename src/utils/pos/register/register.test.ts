import { describe, it, expect } from "vitest";
import type { AdminOrder, AdminStore } from "@medusajs/types";
import type { RegisterSession } from "@/types/register";
import {
  businessDay,
  isStaleSession,
  needsOpenRegister,
  movementTotals,
  computeExpectedCash,
  orderCashContribution,
  hashPin,
  verifyPin,
  isLegacyPinHash,
} from ".";

const session = (over: Partial<RegisterSession> = {}): RegisterSession =>
  ({
    id: "reg_1",
    status: "open",
    openedAt: "2026-08-01T10:00:00.000Z",
    openingFloat: 100,
    movements: [],
    ...over,
  }) as RegisterSession;

// A store whose cash provider is pp_cash_pos (the POS default mapping).
const store = { metadata: {} } as unknown as AdminStore;

describe("businessDay", () => {
  it("keys a timestamp to its calendar day when the cutoff is midnight", () => {
    expect(businessDay("2026-08-01T13:00:00", 0)).toBe("2026-08-01");
  });

  it("shifts late-night sales back into the previous day", () => {
    // 01:00 with a 04:00 cutoff still belongs to the shift that opened the day before.
    expect(businessDay("2026-08-02T01:00:00", 4)).toBe("2026-08-01");
    expect(businessDay("2026-08-02T05:00:00", 4)).toBe("2026-08-02");
  });
});

describe("isStaleSession", () => {
  it("is false for a session opened on the current business day", () => {
    const now = new Date("2026-08-01T18:00:00");
    expect(isStaleSession(session({ openedAt: "2026-08-01T09:00:00" }), 4, now)).toBe(
      false,
    );
  });

  it("is true once the business day has rolled over", () => {
    const now = new Date("2026-08-02T09:00:00");
    expect(isStaleSession(session({ openedAt: "2026-08-01T09:00:00" }), 4, now)).toBe(
      true,
    );
  });
});

describe("needsOpenRegister", () => {
  const now = new Date("2026-08-02T09:00:00");

  it("prompts when there is no session at all", () => {
    expect(needsOpenRegister(null, 4, now)).toBe(true);
  });

  it("prompts for an open session left over from an earlier day", () => {
    expect(
      needsOpenRegister(session({ openedAt: "2026-08-01T09:00:00" }), 4, now),
    ).toBe(true);
  });

  it("does not prompt for an open session from today", () => {
    expect(
      needsOpenRegister(session({ openedAt: "2026-08-02T08:00:00" }), 4, now),
    ).toBe(false);
  });

  it("stays dormant after closing for the current business day", () => {
    const closedToday = session({
      status: "closed",
      openedAt: "2026-08-02T08:00:00",
    });
    expect(needsOpenRegister(closedToday, 4, now)).toBe(false);
  });

  it("prompts again once a new business day starts", () => {
    const closedYesterday = session({
      status: "closed",
      openedAt: "2026-08-01T08:00:00",
    });
    expect(needsOpenRegister(closedYesterday, 4, now)).toBe(true);
  });
});

describe("movementTotals", () => {
  it("sums pay-ins and drops separately", () => {
    const s = session({
      movements: [
        { id: "m1", type: "payin", amount: 50 },
        { id: "m2", type: "drop", amount: 20 },
        { id: "m3", type: "drop", amount: 30 },
      ],
    } as Partial<RegisterSession>);
    expect(movementTotals(s)).toEqual({ payins: 50, drops: 50 });
  });

  it("returns zeroes with no movements", () => {
    expect(movementTotals(session())).toEqual({ payins: 0, drops: 0 });
  });
});

describe("orderCashContribution", () => {
  it("contributes nothing for a cancelled order", () => {
    const order = {
      status: "canceled",
      total: 100,
      metadata: { cash_collected: 100 },
    } as unknown as AdminOrder;
    expect(orderCashContribution(order, store)).toBe(0);
  });

  it("prefers the rounded cash actually collected over the exact total", () => {
    const order = {
      status: "completed",
      total: 99.97,
      metadata: { cash_collected: 100 },
      payment_collections: [],
    } as unknown as AdminOrder;
    expect(orderCashContribution(order, store)).toBe(100);
  });

  it("parses a stringified cash_collected", () => {
    const order = {
      status: "completed",
      total: 50,
      metadata: { cash_collected: "45.50" },
      payment_collections: [],
    } as unknown as AdminOrder;
    expect(orderCashContribution(order, store)).toBe(45.5);
  });

  it("ignores a non-numeric cash_collected and falls through", () => {
    const order = {
      status: "completed",
      total: 50,
      metadata: { cash_collected: "" },
      payment_collections: [],
    } as unknown as AdminOrder;
    expect(orderCashContribution(order, store)).toBe(0);
  });
});

describe("computeExpectedCash", () => {
  it("is openingFloat + sales + payins - drops", () => {
    const s = session({
      openingFloat: 100,
      movements: [
        { id: "m1", type: "payin", amount: 25 },
        { id: "m2", type: "drop", amount: 40 },
      ],
    } as Partial<RegisterSession>);

    const orders = [
      {
        status: "completed",
        total: 60,
        metadata: { cash_collected: 60 },
        payment_collections: [],
      },
      {
        status: "completed",
        total: 15,
        metadata: { cash_collected: 15 },
        payment_collections: [],
      },
    ] as unknown as AdminOrder[];

    // 100 + (60 + 15) + 25 - 40
    expect(computeExpectedCash(s, orders, store)).toBe(160);
  });

  it("is just the float when nothing has happened", () => {
    expect(computeExpectedCash(session({ openingFloat: 75 }), [], store)).toBe(75);
  });
});

describe("PIN hashing", () => {
  it("round-trips a PIN through the salted hash", async () => {
    const stored = await hashPin("1234");
    expect(await verifyPin("1234", stored)).toBe(true);
    expect(await verifyPin("1235", stored)).toBe(false);
  });

  it("salts each hash so two identical PINs do not collide", async () => {
    expect(await hashPin("1234")).not.toBe(await hashPin("1234"));
  });

  it("still verifies legacy unsalted SHA-256 hashes", async () => {
    // SHA-256("1234")
    const legacy =
      "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
    expect(isLegacyPinHash(legacy)).toBe(true);
    expect(await verifyPin("1234", legacy)).toBe(true);
    expect(await verifyPin("9999", legacy)).toBe(false);
  });

  it("does not mistake a new-format hash for a legacy one", async () => {
    expect(isLegacyPinHash(await hashPin("1234"))).toBe(false);
  });

  it("rejects a malformed stored value instead of throwing", async () => {
    expect(await verifyPin("1234", "garbage")).toBe(false);
    expect(await verifyPin("1234", "")).toBe(false);
  });
});
