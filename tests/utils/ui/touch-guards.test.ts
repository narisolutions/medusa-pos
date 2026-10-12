import { describe, it, expect } from "vitest";
import { keepsContextMenu } from "@/utils/ui/touch-guards";

// Node has no DOM, so a minimal Element stand-in with closest() is enough.
class FakeElement {
  constructor(private matches: boolean) {}
  closest() {
    return this.matches ? this : null;
  }
}

describe("keepsContextMenu", () => {
  it("keeps the browser menu in text fields, for copy and paste", () => {
    (globalThis as { Element?: unknown }).Element = FakeElement;
    expect(keepsContextMenu(new FakeElement(true) as unknown as EventTarget)).toBe(true);
  });

  it("drops it everywhere else, so a long press on a button does nothing", () => {
    (globalThis as { Element?: unknown }).Element = FakeElement;
    expect(keepsContextMenu(new FakeElement(false) as unknown as EventTarget)).toBe(false);
    expect(keepsContextMenu(null)).toBe(false);
  });
});
