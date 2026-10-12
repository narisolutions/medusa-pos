import { describe, it, expect } from "vitest";
import { applyNumpadKey } from "@/utils/ui/numpad";

describe("applyNumpadKey", () => {
  it("replaces a leading zero and appends digits", () => {
    expect(applyNumpadKey("0", "5")).toBe("5");
    expect(applyNumpadKey("12", "3")).toBe("123");
  });

  it("starts a decimal as 0. and allows one point", () => {
    expect(applyNumpadKey("", ".")).toBe("0.");
    expect(applyNumpadKey("0", ".")).toBe("0.");
    expect(applyNumpadKey("4.5", ".")).toBe("4.5");
    expect(applyNumpadKey("4", ".", { allowDecimal: false })).toBe("4");
  });

  it("stops at the money precision", () => {
    expect(applyNumpadKey("4.50", "1", { maxDecimals: 2 })).toBe("4.50");
    expect(applyNumpadKey("4.5", "1", { maxDecimals: 2 })).toBe("4.51");
  });

  it("types over a prefilled value when asked", () => {
    expect(applyNumpadKey("3", "5", { replace: true })).toBe("5");
    expect(applyNumpadKey("3", ".", { replace: true })).toBe("0.");
    expect(applyNumpadKey("3", "backspace", { replace: true })).toBe("");
  });

  it("deletes one character, or everything", () => {
    expect(applyNumpadKey("4.5", "backspace")).toBe("4.");
    expect(applyNumpadKey("4.5", "clear")).toBe("");
  });
});
