import { describe, it, expect } from "vitest";
import { AdminStore } from "@medusajs/types";
import {
  bankDetailsPayload,
  getBankDetails,
  getMethodType,
  IBAN_PATTERN,
  normalizeIban,
  savedBankAccounts,
} from "@/utils/settings/store/metadata";

const store = (methods: unknown[]): AdminStore =>
  ({ metadata: { pos: { payment_methods: methods } } }) as unknown as AdminStore;

describe("getMethodType", () => {
  it("reads the explicit type", () => {
    const s = store([{ id: "pp_tbc_pos", label: "TBC", enabled: true, type: "transfer" }]);
    expect(getMethodType(s, "pp_tbc_pos")).toBe("transfer");
  });

  it("matches the provider id regardless of case", () => {
    // The label lookup has always been case-insensitive. When this one was not,
    // a receipt showed the right method while the behaviour silently became card.
    const s = store([{ id: "PP_TBC_POS", label: "TBC", enabled: true, type: "transfer" }]);
    expect(getMethodType(s, "pp_tbc_pos")).toBe("transfer");
  });

  it("infers any type from the icon when type is unset, not just cash", () => {
    const s = store([
      { id: "pp_cash_pos", label: "Cash", enabled: true, icon: "cash" },
      { id: "pp_tbc_pos", label: "TBC", enabled: true, icon: "transfer" },
      { id: "pp_bog_pos", label: "BOG", enabled: true, icon: "card" },
    ]);
    expect(getMethodType(s, "pp_cash_pos")).toBe("cash");
    expect(getMethodType(s, "pp_tbc_pos")).toBe("transfer");
    expect(getMethodType(s, "pp_bog_pos")).toBe("card");
  });

  it("prefers the explicit type over the icon", () => {
    const s = store([
      { id: "pp_x", label: "X", enabled: true, icon: "transfer", type: "card" },
    ]);
    expect(getMethodType(s, "pp_x")).toBe("card");
  });

  it("defaults to card for an unknown or missing provider", () => {
    const s = store([{ id: "pp_cash_pos", label: "Cash", enabled: true, type: "cash" }]);
    expect(getMethodType(s, "pp_unknown")).toBe("card");
    expect(getMethodType(s, undefined)).toBe("card");
  });

  it("reads a bank transfer, explicitly or from a legacy icon", () => {
    const s = store([
      { id: "pp_banktransfer_pos", label: "Bank transfer", enabled: true, type: "bank_transfer" },
      { id: "pp_bank_legacy", label: "Bank", enabled: true, icon: "bank_transfer" },
    ]);
    expect(getMethodType(s, "pp_banktransfer_pos")).toBe("bank_transfer");
    expect(getMethodType(s, "pp_bank_legacy")).toBe("bank_transfer");
  });

  it("reads an icon it does not know as card", () => {
    const s = store([{ id: "pp_x", label: "X", enabled: true, icon: "voucher" }]);
    expect(getMethodType(s, "pp_x")).toBe("card");
  });

  it("falls back to the built-in methods when none are configured", () => {
    const empty = { metadata: {} } as unknown as AdminStore;
    expect(getMethodType(empty, "pp_cash_pos")).toBe("cash");
    expect(getMethodType(empty, "pp_manual_pos")).toBe("card");
  });
});

describe("getBankDetails", () => {
  const withBank = (bank_details: unknown): AdminStore =>
    ({ metadata: { pos: { bank_details } } }) as unknown as AdminStore;

  it("reads a store saved before multi-account as one account", () => {
    const details = { beneficiary: "Shop LLC", bank_name: "City Bank", iban: "GE29NB0000000101904917" };
    expect(getBankDetails(withBank(details))).toEqual({
      beneficiary: "Shop LLC",
      accounts: [{ bank_name: "City Bank", iban: "GE29NB0000000101904917" }],
    });
  });

  it("reads the list over the old single account, keeping only accounts with an IBAN", () => {
    const store = {
      metadata: {
        pos: {
          bank_beneficiary: "Shop LLC",
          bank_accounts: [
            { bank_name: "City Bank", iban: "GE29NB0000000101904917" },
            { bank_name: "Half-typed" },
            { bank_name: "Bay Bank", iban: "GE60BG0000000549780308", swift: "BAGAGE22" },
          ],
          bank_details: { beneficiary: "Old LLC", iban: "GE00OLD0000000000000000" },
        },
      },
    } as unknown as AdminStore;
    expect(getBankDetails(store)).toEqual({
      beneficiary: "Shop LLC",
      accounts: [
        { bank_name: "City Bank", iban: "GE29NB0000000101904917" },
        { bank_name: "Bay Bank", iban: "GE60BG0000000549780308", swift: "BAGAGE22" },
      ],
    });
  });

  it("returns nothing without an IBAN, since there is nothing to pay to", () => {
    expect(getBankDetails(withBank({ beneficiary: "Shop LLC", bank_name: "City Bank" }))).toBeUndefined();
    expect(getBankDetails({ metadata: {} } as unknown as AdminStore)).toBeUndefined();
  });
});

describe("bankDetailsPayload", () => {
  it("writes the list, drops empty cards and mirrors the main account for older tills", () => {
    expect(
      bankDetailsPayload(" Shop LLC ", [
        { bankName: " City Bank ", iban: "ge29 nb00 0000 0101 9049 17", swift: "" },
        { bankName: "", iban: "", swift: "" },
        { bankName: "Bay Bank", iban: "GE60BG0000000549780308", swift: "bagage22" },
      ])
    ).toEqual({
      bank_beneficiary: "Shop LLC",
      bank_accounts: [
        { bank_name: "City Bank", iban: "GE29NB0000000101904917", swift: undefined },
        { bank_name: "Bay Bank", iban: "GE60BG0000000549780308", swift: "BAGAGE22" },
      ],
      bank_details: { beneficiary: "Shop LLC", bank_name: "City Bank", iban: "GE29NB0000000101904917" },
    });
  });

  it("clears the old single account when every card is removed", () => {
    expect(bankDetailsPayload("", [{ bankName: "", iban: "", swift: "" }]).bank_details).toEqual({
      beneficiary: undefined,
      bank_name: undefined,
      iban: undefined,
    });
  });
});

describe("savedBankAccounts", () => {
  it("opens the form on the old single account, or one empty card", () => {
    expect(savedBankAccounts({ bank_details: { bank_name: "City Bank", iban: "GE29NB0000000101904917" } })).toEqual([
      { bankName: "City Bank", iban: "GE29NB0000000101904917", swift: "" },
    ]);
    expect(savedBankAccounts({})).toEqual([{ bankName: "", iban: "", swift: "" }]);
  });
});

describe("IBAN", () => {
  it("is stored compact and upper-case, however it was typed", () => {
    expect(normalizeIban(" ge29 nb00 0000 0101 9049 17 ")).toBe("GE29NB0000000101904917");
  });

  it("accepts the shape every country shares and refuses anything else", () => {
    expect(IBAN_PATTERN.test("GE29NB0000000101904917")).toBe(true);
    expect(IBAN_PATTERN.test("DE89370400440532013000")).toBe(true);
    expect(IBAN_PATTERN.test("GE29")).toBe(false);
    expect(IBAN_PATTERN.test("29GENB0000000101904917")).toBe(false);
    expect(IBAN_PATTERN.test("ge29nb0000000101904917")).toBe(false);
  });
});
