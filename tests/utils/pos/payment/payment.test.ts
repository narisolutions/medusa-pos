import { describe, it, expect } from "vitest";
import { AdminOrder, AdminStore } from "@medusajs/types";
import {
  allocateRefund,
  defaultRefundPayment,
  getOrderChosenProviderId,
  getOrderPaymentMethodType,
  getPaymentMethodLabel,
  groupProvidersForTill,
  paymentsCovering,
  type RefundablePayment,
} from "@/utils/pos/payment";

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

describe("getPaymentMethodLabel", () => {
  const store = {
    metadata: { pos: { payment_methods: [{ id: "pp_cash_pos", label: "Cash", enabled: true }] } },
  } as never;

  it("uses the configured label, matched case-insensitively", () => {
    expect(getPaymentMethodLabel(store, "PP_CASH_POS")).toBe("Cash");
  });

  it("names Medusa's system fallback instead of showing its id", () => {
    expect(getPaymentMethodLabel(store, "pp_system_default")).toBe("Other");
  });

  it("leaves any other unknown provider visible for diagnosis", () => {
    expect(getPaymentMethodLabel(store, "pp_mystery")).toBe("pp_mystery");
    expect(getPaymentMethodLabel(store, undefined)).toBe("");
  });
});

describe("getOrderChosenProviderId", () => {
  const order = (fields: Record<string, unknown>) => fields as unknown as AdminOrder;
  const paidWith = (provider_id: string) => ({ payment_collections: [{ payments: [{ provider_id }] }] });

  it("shows the method chosen for an unpaid pay-later order", () => {
    expect(getOrderChosenProviderId(order({ metadata: { pay_later_method: "pp_banktransfer_pos" } }))).toBe(
      "pp_banktransfer_pos"
    );
  });

  it("prefers the provider that actually paid", () => {
    const paid = order({ ...paidWith("pp_tbc_pos"), metadata: { pay_later_method: "pp_banktransfer_pos" } });
    expect(getOrderChosenProviderId(paid)).toBe("pp_tbc_pos");
  });

  it("never makes an unpaid cash order behave as cash", () => {
    const store = { metadata: {} } as unknown as AdminStore;
    const unpaid = order({ metadata: { pay_later_method: "pp_cash_pos" } });
    expect(getOrderChosenProviderId(unpaid)).toBe("pp_cash_pos");
    expect(getOrderPaymentMethodType(unpaid, store)).toBe("card");
  });
});

describe("groupProvidersForTill", () => {
  it("puts the till's own providers first and the web shop's and platforms' after, each sorted", () => {
    expect(
      groupProvidersForTill([
        "pp_bog_wineland",
        "pp_tbc_pos",
        "pp_banktransfer_pos",
        "pp_system_default",
        "pp_bolt_delivery",
        "pp_cash_pos",
        "pp_cash_pos",
      ])
    ).toEqual({
      till: ["pp_banktransfer_pos", "pp_cash_pos", "pp_system_default", "pp_tbc_pos"],
      other: ["pp_bog_wineland", "pp_bolt_delivery"],
    });
  });
});
