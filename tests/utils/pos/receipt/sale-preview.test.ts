import { describe, it, expect } from "vitest";
import type { ReceiptData } from "@/types/utils";
import { receiptAsPaid } from "@/utils/pos/receipt/sale-preview";

const draft = {
  orderDisplayId: "57",
  total: 24.5,
  isUnpaid: true,
  amountDue: 24.5,
  amountPaid: 0,
  paymentMethod: "",
  bankDetails: { iban: "GE00TEST" },
} as unknown as ReceiptData;

describe("receiptAsPaid", () => {
  it("prints cash handed over and the change", () => {
    const r = receiptAsPaid(draft, { paymentMethod: "Cash", isCash: true, cashPaid: 50, cashDue: 24.5, orderNumber: "—" });
    expect(r).toMatchObject({ isUnpaid: false, amountPaid: 50, change: 25.5, paymentMethod: "Cash", orderDisplayId: "—" });
    expect(r.amountDue).toBeUndefined();
    expect(r.bankDetails).toBeUndefined();
  });

  it("assumes exact cash when nothing is typed yet, and a card pays the total", () => {
    expect(receiptAsPaid(draft, { paymentMethod: "Cash", isCash: true, cashPaid: 0, cashDue: 24.5, orderNumber: "—" })).toMatchObject({ amountPaid: 24.5, change: 0 });
    expect(receiptAsPaid(draft, { paymentMethod: "TBC", isCash: false, cashPaid: 0, cashDue: 24.5, orderNumber: "—" })).toMatchObject({ amountPaid: 24.5, change: 0 });
  });

  it("adds the rounding line only where cash rounding moved the amount", () => {
    expect(receiptAsPaid(draft, { paymentMethod: "Cash", isCash: true, cashPaid: 0, cashDue: 24.55, orderNumber: "—" }).cashRounding).toBeCloseTo(0.05);
    expect(receiptAsPaid(draft, { paymentMethod: "Cash", isCash: true, cashPaid: 0, cashDue: 24.5, orderNumber: "—" }).cashRounding).toBeUndefined();
  });
});
