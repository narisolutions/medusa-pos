import { describe, it, expect } from "vitest";
import { sameFormValues } from "@/utils/forms/same-values";

describe("sameFormValues", () => {
  it("treats an undefined key as absent", () => {
    expect(sameFormValues({ id: "cash", type: undefined }, { id: "cash" })).toBe(true);
  });

  it("is back to unchanged once an edit is undone", () => {
    const saved = { name: "Store", methods: [{ id: "cash", enabled: true }] };
    expect(sameFormValues({ name: "Store3", methods: [{ id: "cash", enabled: true }] }, saved)).toBe(false);
    expect(sameFormValues({ name: "Store", methods: [{ id: "cash", enabled: true }] }, saved)).toBe(true);
  });

  it("sees added, removed and changed list items", () => {
    const saved = { methods: [{ id: "cash" }] };
    expect(sameFormValues({ methods: [{ id: "cash" }, { id: "" }] }, saved)).toBe(false);
    expect(sameFormValues({ methods: [] }, saved)).toBe(false);
    expect(sameFormValues({ methods: [{ id: "card" }] }, saved)).toBe(false);
  });

  it("keeps an empty string distinct from a missing value", () => {
    expect(sameFormValues({ note: "" }, {})).toBe(false);
  });
});
