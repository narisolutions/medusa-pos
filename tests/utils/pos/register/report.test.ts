import { describe, it, expect } from "vitest";
import type { AdminOrder, AdminStore } from "@medusajs/types";
import type { CashMovement, RegisterSession } from "@/types/register";
import { computeExpectedCash } from "@/utils/pos/register";
import { buildSessionReport, REPORT_TENDERS } from "@/utils/pos/register/report";

const store = {
  metadata: {
    pos: {
      payment_methods: [
        { id: "pp_cash_pos", label: "Cash", enabled: true, type: "cash" },
        { id: "pp_manual_pos", label: "Card", enabled: true, type: "card" },
        { id: "pp_banktransfer_pos", label: "Bank transfer", enabled: true, type: "bank_transfer" },
        { id: "pp_transfer_pos", label: "Transfer", enabled: true, type: "transfer" },
      ],
    },
  },
} as unknown as AdminStore;

const movement = (type: CashMovement["type"], amount: number): CashMovement => ({
  id: `mov_${type}_${amount}`,
  type,
  amount,
  reason: "test",
  at: "2026-10-28T12:00:00.000Z",
});

const session = (movements: CashMovement[] = []): RegisterSession => ({
  id: "reg_1",
  status: "open",
  openedAt: "2026-10-28T09:00:00.000Z",
  openingFloat: 50,
  movements,
});

type Payment = { provider_id: string; amount: number; refunds?: { amount: number }[] };

const order = (
  payments: Payment[],
  over: Partial<{ status: string; total: number; metadata: Record<string, unknown> }> = {}
) =>
  ({
    status: "completed",
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    metadata: {},
    payment_collections: [{ created_at: "2026-10-28T10:00:00Z", payments }],
    ...over,
  }) as unknown as AdminOrder;

describe("buildSessionReport", () => {
  it("prints every tender, zeros included, for an empty session", () => {
    const report = buildSessionReport(session(), [], store);
    expect(Object.keys(report.tenders)).toEqual(REPORT_TENDERS);
    for (const tender of REPORT_TENDERS) expect(report.tenders[tender]).toEqual({ count: 0, amount: 0 });
    expect(report.cash).toEqual({ openingFloat: 50, cashSales: 0, cashRefunds: 0, payins: 0, drops: 0, expected: 50 });
    expect(report.sales).toBe(0);
  });

  it("counts and sums payments per tender, a split sale in each tender it used", () => {
    const report = buildSessionReport(
      session(),
      [
        order([{ provider_id: "pp_cash_pos", amount: 14.99 }]),
        order([{ provider_id: "pp_manual_pos", amount: 30 }]),
        order([
          { provider_id: "pp_cash_pos", amount: 5.49 },
          { provider_id: "pp_manual_pos", amount: 10 },
        ]),
        order([{ provider_id: "pp_banktransfer_pos", amount: 150 }]),
        order([{ provider_id: "pp_transfer_pos", amount: 20 }]),
      ],
      store
    );
    expect(report.tenders.cash).toEqual({ count: 2, amount: 20.48 });
    expect(report.tenders.card).toEqual({ count: 2, amount: 40 });
    expect(report.tenders.bank_transfer).toEqual({ count: 1, amount: 150 });
    expect(report.tenders.transfer).toEqual({ count: 1, amount: 20 });
    expect(report.sales).toBe(5);
  });

  it("splits refunds into cash and other, and nets cash refunds out of the drawer", () => {
    const report = buildSessionReport(
      session(),
      [
        order([{ provider_id: "pp_cash_pos", amount: 40, refunds: [{ amount: 12 }] }]),
        order([{ provider_id: "pp_manual_pos", amount: 30, refunds: [{ amount: 5 }, { amount: 2.5 }] }]),
      ],
      store
    );
    expect(report.refunds.cash).toEqual({ count: 1, amount: 12 });
    expect(report.refunds.other).toEqual({ count: 2, amount: 7.5 });
    expect(report.cash.cashSales).toBe(40);
    expect(report.cash.cashRefunds).toBe(12);
    expect(report.cash.expected).toBe(78);
  });

  it("uses the rounded cash collected in the drawer block, the captured amount in the tender line", () => {
    const report = buildSessionReport(
      session(),
      [order([{ provider_id: "pp_cash_pos", amount: 99.97 }], { metadata: { cash_collected: 100 } })],
      store
    );
    expect(report.cash.cashSales).toBe(100);
    expect(report.tenders.cash.amount).toBe(99.97);
  });

  it("counts a pay-later order with nothing captured as unpaid, not as a tender", () => {
    const report = buildSessionReport(
      session(),
      [order([], { total: 300, metadata: { pay_later: true, pay_later_method: "pp_banktransfer_pos" } })],
      store
    );
    expect(report.unpaid).toEqual({ count: 1, amount: 300 });
    expect(report.tenders.bank_transfer).toEqual({ count: 0, amount: 0 });
  });

  it("counts cancelled orders apart and keeps their payments out", () => {
    const report = buildSessionReport(
      session(),
      [order([{ provider_id: "pp_cash_pos", amount: 25 }], { status: "canceled" })],
      store
    );
    expect(report.cancelled).toBe(1);
    expect(report.sales).toBe(0);
    expect(report.tenders.cash.count).toBe(0);
  });

  it("files a pp_system_default capture under the method chosen at checkout", () => {
    const marked = {
      status: "completed",
      total: 60,
      metadata: {},
      payment_collections: [
        {
          payments: [{ provider_id: "pp_system_default", amount: 60 }],
          payment_sessions: [{ provider_id: "pp_banktransfer_pos" }],
        },
      ],
    } as unknown as AdminOrder;
    const report = buildSessionReport(session(), [marked], store);
    expect(report.tenders.bank_transfer).toEqual({ count: 1, amount: 60 });
  });

  it("counts movements, no-sales included, and no-sales move no cash", () => {
    const report = buildSessionReport(
      session([movement("payin", 10), movement("drop", 100), movement("no_sale", 0), movement("no_sale", 0)]),
      [],
      store
    );
    expect(report.movements).toEqual({
      payins: { count: 1, amount: 10 },
      drops: { count: 1, amount: 100 },
      noSales: 2,
    });
    expect(report.cash.expected).toBe(50 + 10 - 100);
  });

  it("agrees with computeExpectedCash to the tetri", () => {
    const s = session([movement("payin", 0.1), movement("drop", 0.2)]);
    const orders = [
      order([{ provider_id: "pp_cash_pos", amount: 14.99 }]),
      order([{ provider_id: "pp_cash_pos", amount: 5.49, refunds: [{ amount: 0.07 }] }]),
      order([{ provider_id: "pp_manual_pos", amount: 3 }]),
    ];
    expect(buildSessionReport(s, orders, store).cash.expected).toBe(computeExpectedCash(s, orders, store));
  });
});
