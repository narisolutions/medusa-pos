import { describe, it, expect } from "vitest";
import { buildReceiptDoc, buildReceiptPDF, DEFAULT_RECEIPT_LABELS, isOrderUnpaid, type ReceiptData } from "@/utils/pos/receipt";

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

const bankDetails = { beneficiary: "Shop LLC", accounts: [{ bankName: "City Bank", iban: "GE29NB0000000101904917" }] };

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
    const labels = rowsOf({ ...base, isUnpaid: true, bankDetails: { accounts: [{ iban: "GE29NB0000000101904917" }] } }).map(
      (row) => row.label
    );
    expect(labels).toEqual(["Payment Method", "Amount Due", "IBAN", "Reference"]);
  });

  it("list every account, main first, under one payee and one reference", () => {
    const twoBanks = {
      beneficiary: "Shop LLC",
      accounts: [
        { bankName: "City Bank", iban: "GE29NB0000000101904917" },
        { bankName: "Bay Bank", iban: "GE60BG0000000549780308", swift: "BAGAGE22" },
      ],
    };
    expect(rowsOf({ ...base, isUnpaid: true, amountDue: 60, bankDetails: twoBanks }).slice(2)).toEqual([
      { label: "Pay to", value: "Shop LLC" },
      { label: "Bank", value: "City Bank" },
      { label: "IBAN", value: "GE29NB0000000101904917" },
      { label: "Bank", value: "Bay Bank" },
      { label: "IBAN", value: "GE60BG0000000549780308" },
      { label: "SWIFT", value: "BAGAGE22" },
      { label: "Reference", value: "#1234" },
    ]);
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

describe("receipt title", () => {
  it("is the receipt's once paid, and a bill while payment is outstanding", () => {
    expect(buildReceiptDoc(base).title).toBe(DEFAULT_RECEIPT_LABELS.title);
    expect(buildReceiptDoc({ ...base, isUnpaid: true, amountDue: 60 }).title).toBe(DEFAULT_RECEIPT_LABELS.billTitle);
  });
});

describe("isOrderUnpaid", () => {
  it("is true while payment is outstanding, including a pay-later order", () => {
    expect(isOrderUnpaid({ payment_status: "not_paid" })).toBe(true);
    expect(isOrderUnpaid({ payment_status: "awaiting" })).toBe(true);
    expect(isOrderUnpaid({ payment_status: "authorized", metadata: { pay_later: true } })).toBe(true);
  });

  it("is false once paid, and on a partly paid order", () => {
    expect(isOrderUnpaid({ payment_status: "captured" })).toBe(false);
    expect(isOrderUnpaid({ payment_status: "captured", metadata: { pay_later: true } })).toBe(false);
    expect(isOrderUnpaid({ payment_status: "partially_captured" })).toBe(false);
  });
});

describe("receipt PDF title", () => {
  const pdfText = async (data: ReceiptData) => new TextDecoder("latin1").decode(await buildReceiptPDF(data));

  it("reads BILL while payment is outstanding, like the printed one", async () => {
    const unpaid = await pdfText({ ...base, isUnpaid: true, amountDue: 60 });
    expect(unpaid).toContain("(BILL)");
    expect(unpaid).not.toContain("(SALES RECEIPT)");
    expect(await pdfText({ ...base, amountPaid: 60 })).toContain("(SALES RECEIPT)");
  });
});
