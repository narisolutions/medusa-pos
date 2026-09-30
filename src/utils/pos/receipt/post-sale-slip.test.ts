import { describe, it, expect } from "vitest";
import { buildPostSaleSlipDoc, type PostSaleSlipLabels } from "./post-sale-slip";

const labels: PostSaleSlipLabels = {
  title: { return: "RETURN", exchange: "EXCHANGE", add: "ADDED ITEMS" },
  date: "Date", time: "Time", order: "Order", items: "ITEMS",
  back: "Back", out: "Out", restock: "back to stock", damaged: "damaged",
  comingBack: "Coming back", goingOut: "Going out", paymentMethod: "Payment Method",
  customerPaid: "Customer paid", refunded: "Refunded", owed: "Added to amount owed", even: "EVEN - NOTHING TO SETTLE",
  footer: "Keep this slip",
};

describe("buildPostSaleSlipDoc", () => {
  it("lists what came back as a credit, with its condition, and the refund", () => {
    const doc = buildPostSaleSlipDoc(
      {
        kind: "return",
        orderDisplayId: 527,
        currency: "GEL",
        back: [
          { title: "Saperavi", quantity: 1, unitPrice: 5, condition: "restock" },
          { title: "Saperavi", quantity: 1, unitPrice: 5, condition: "damaged" },
        ],
        out: [],
        settlement: { direction: "refund", amount: 10, method: "Cash" },
      },
      labels,
      ["Wineland"]
    );
    expect(doc.title).toBe("RETURN");
    expect(doc.items.map((i) => [i.total, i.sublines?.[0]?.text])).toEqual([
      [-5, "Back - back to stock"],
      [-5, "Back - damaged"],
    ]);
    expect(doc.totalRows).toEqual([{ label: "Coming back", amount: -10 }]);
    expect(doc.paymentRows).toEqual([
      { label: "Payment Method", value: "Cash" },
      { label: "Refunded", amount: 10 },
    ]);
  });

  it("shows both sides of an exchange, and says so when nothing was settled", () => {
    const doc = buildPostSaleSlipDoc(
      {
        kind: "exchange",
        orderDisplayId: 527,
        currency: "GEL",
        back: [{ title: "Saperavi", quantity: 1, unitPrice: 5, condition: "damaged" }],
        out: [{ title: "Saperavi 750ml", quantity: 1, unitPrice: 5 }],
        settlement: { direction: "even" },
      },
      labels,
      []
    );
    expect(doc.totalRows).toEqual([
      { label: "Coming back", amount: -5 },
      { label: "Going out", amount: 5 },
    ]);
    expect(doc.paymentRows).toEqual([]);
    expect(doc.messages).toEqual(["EVEN - NOTHING TO SETTLE"]);
  });

  it("says the added amount joins what is owed on an unpaid order", () => {
    const doc = buildPostSaleSlipDoc(
      {
        kind: "add",
        orderDisplayId: 500,
        currency: "GEL",
        back: [],
        out: [{ title: "Saperavi 750ml", quantity: 1, unitPrice: 5 }],
        settlement: { direction: "owed", amount: 5 },
      },
      labels,
      []
    );
    expect(doc.paymentRows).toEqual([{ label: "Added to amount owed", amount: 5 }]);
    expect(doc.messages).toEqual([]);
  });
});
