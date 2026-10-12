import { describe, it, expect } from "vitest";
import { displayZoom } from "@/utils/ui/display-size";

describe("displayZoom", () => {
  it("scales compact down and large up", () => {
    expect(displayZoom("compact")).toBeLessThan(1);
    expect(displayZoom("standard")).toBe(1);
    expect(displayZoom("large")).toBeGreaterThan(1);
  });

  it("falls back to standard for a missing or unknown size", () => {
    expect(displayZoom(undefined)).toBe(1);
    expect(displayZoom("huge" as never)).toBe(1);
  });
});
