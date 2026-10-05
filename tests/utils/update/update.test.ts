import { describe, it, expect } from "vitest";
import { canInstallUpdateNow } from "@/utils/update";

describe("canInstallUpdateNow", () => {
  it("allows installing at an empty till", () => {
    expect(canInstallUpdateNow({ itemCount: 0, draftOrderId: null })).toBe(true);
  });

  it("waits while a sale is rung up or being paid", () => {
    expect(canInstallUpdateNow({ itemCount: 2, draftOrderId: null })).toBe(false);
  });

  it("waits while the till is bound to a parked draft", () => {
    expect(canInstallUpdateNow({ itemCount: 0, draftOrderId: "draft_1" })).toBe(false);
  });
});
