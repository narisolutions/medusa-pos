import { describe, it, expect } from "vitest";
import { isNetworkError } from ".";

describe("isNetworkError", () => {
  it("recognises a request that got no answer", () => {
    expect(isNetworkError(new Error("error sending request for url (https://x/admin/regions)"))).toBe(true);
    expect(isNetworkError(new Error("Failed to fetch"))).toBe(true);
  });

  it("does not treat an HTTP answer as a network failure", () => {
    expect(isNetworkError(Object.assign(new Error("error sending request"), { status: 502 }))).toBe(false);
    expect(isNetworkError(Object.assign(new Error("Not found"), { status: 404 }))).toBe(false);
  });

  it("ignores everything that is not an error about the connection", () => {
    expect(isNetworkError(new Error("Insufficient stock"))).toBe(false);
    expect(isNetworkError("error sending request")).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
