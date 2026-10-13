import { describe, it, expect } from "vitest";
import { isStagingBackend } from "@/utils/auth/environment";

describe("isStagingBackend", () => {
  it("spots a staging backend address", () => {
    expect(isStagingBackend("https://api-staging.example.com")).toBe(true);
    expect(isStagingBackend("https://Staging.example.com")).toBe(true);
  });

  it("treats anything else, or no address, as production", () => {
    expect(isStagingBackend("https://api.example.com")).toBe(false);
    expect(isStagingBackend(undefined)).toBe(false);
  });
});
