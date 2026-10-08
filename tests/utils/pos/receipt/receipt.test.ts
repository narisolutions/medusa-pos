import { describe, it, expect } from "vitest";
import { buildReceiptDoc, DEFAULT_RECEIPT_LABELS, type ReceiptData } from "@/utils/pos/receipt";

const base: ReceiptData = {
  storeName: "Store",
  companyName: "Shop LLC",
  storeAddress: "1 Main St",
  orderDisplayId: "1234",
  items: [{ title: "Saperavi", unit_price: 30, quantity: 2 }],
  subtotal: 50.85,
  tax: 9.15,
  total: 60,
  currency: "GEL",
  paymentMethod: "Bank transfer",
};

const bankDetails = { beneficiary: "Shop LLC", bankName: "City Bank", iban: "GE29NB0000000101904917" };

const rowsOf = (data: ReceiptData) =>
  (buildReceiptDoc(data).paymentRows ?? []).map((row) => ({
    label: row.label,
    value: "value" in row ? row.value : row.amount,
  }));

describe("receipt bank details", () => {
  it("print on an unpaid receipt after the amount due, with the order number as reference", () => {
    expect(rowsOf({ ...base, isUnpaid: true, amountDue: 60, bankDetails })).toEqual([
      { label: DEFAULT_RECEIPT_LABELS.paymentMethod, value: "Bank transfer" },
      { label: DEFAULT_RECEIPT_LABELS.amountDue, value: 60 },
      { label: "Pay to", value: "Shop LLC" },
      { label: "Bank", value: "City Bank" },
      { label: "IBAN", value: "GE29NB0000000101904917" },
      { label: "Reference", value: "#1234" },
    ]);
  });

  it("leave out what was not set, but never the IBAN and reference", () => {
    const labels = rowsOf({ ...base, isUnpaid: true, bankDetails: { iban: "GE29NB0000000101904917" } }).map(
      (row) => row.label
    );
    expect(labels).toEqual(["Payment Method", "Amount Due", "IBAN", "Reference"]);
  });

  it("never print on a paid receipt", () => {
    const labels = rowsOf({ ...base, amountPaid: 60, bankDetails }).map((row) => row.label);
    expect(labels).toEqual(["Payment Method", "Amount Paid"]);
  });
});

describe("receipt payment method", () => {
  it("is left out when the order has none recorded, rather than guessed", () => {
    const labels = rowsOf({ ...base, paymentMethod: "", isUnpaid: true }).map((row) => row.label);
    expect(labels).toEqual(["Amount Due"]);
  });
});
