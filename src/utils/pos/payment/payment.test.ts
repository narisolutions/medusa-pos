import { describe, it, expect } from "vitest";
import { allocateRefund, defaultRefundPayment, paymentsCovering, type RefundablePayment } from ".";

const payment = (id: string, refundable: number): RefundablePayment => ({
  id,
  captured: refundable,
  refunded: 0,
  refundable,
});

describe("allocateRefund", () => {
  it("refunds from a single payment when one covers it", () => {
    expect(allocateRefund([payment("p5", 5), payment("p10", 10)], 8)).toEqual([
      { id: "p10", amount: 8 },
    ]);
  });

  it("spans payments, largest first, when none covers it alone", () => {
    expect(allocateRefund([payment("p5", 5), payment("p10", 10)], 12)).toEqual([
      { id: "p10", amount: 10 },
      { id: "p5", amount: 2 },
    ]);
  });

  it("returns null when the payments cannot cover the amount", () => {
    expect(allocateRefund([payment("p5", 5)], 5.01)).toBeNull();
    expect(allocateRefund([], 1)).toBeNull();
  });

  it("works in cents, so float amounts add up exactly", () => {
    expect(allocateRefund([payment("a", 0.1), payment("b", 0.2)], 0.3)).toEqual([
      { id: "b", amount: 0.2 },
      { id: "a", amount: 0.1 },
    ]);
  });
});

describe("paymentsCovering and defaultRefundPayment", () => {
  const card = payment("card_3.49", 3.49);
  const cash = payment("cash_5.49", 5.49);

  it("lists only the payments that can refund the whole amount alone", () => {
    expect(paymentsCovering([card, cash], 5.49)).toEqual([cash]);
    expect(paymentsCovering([card, cash], 3)).toEqual([card, cash]);
    expect(paymentsCovering([card, cash], 6)).toEqual([]);
  });

  it("suggests the payment for exactly that amount, else the most recent", () => {
    expect(defaultRefundPayment([card, cash], 3.49)).toBe(card);
    expect(defaultRefundPayment([card, cash], 3)).toBe(cash);
    expect(defaultRefundPayment([], 3)).toBeUndefined();
  });
});
