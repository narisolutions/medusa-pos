import { describe, it, expect } from "vitest";
import { AdminStore } from "@medusajs/types";
import { getMethodType } from "./metadata";

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

  it("falls back to the built-in methods when none are configured", () => {
    const empty = { metadata: {} } as unknown as AdminStore;
    expect(getMethodType(empty, "pp_cash_pos")).toBe("cash");
    expect(getMethodType(empty, "pp_manual_pos")).toBe("card");
  });
});
