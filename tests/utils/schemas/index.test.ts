import { describe, it, expect } from "vitest";
import schemas from "@/utils/schemas";

describe("closeRegister schema", () => {
  const parse = (fiscalZRef?: string) => schemas.closeRegister.safeParse({ countedCash: 0, fiscalZRef });

  it("accepts a digits-only Z number", () => {
    expect(parse("00412").success).toBe(true);
  });

  it("accepts an empty or missing Z number", () => {
    expect(parse("").success).toBe(true);
    expect(parse(undefined).success).toBe(true);
  });

  it("refuses letters and spaces", () => {
    expect(parse("t").success).toBe(false);
    expect(parse("12a").success).toBe(false);
    expect(parse(" 12").success).toBe(false);
  });
});
