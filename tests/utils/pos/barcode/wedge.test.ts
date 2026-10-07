import { describe, it, expect } from "vitest";
import { isEditableTarget, isScannerBurst } from "@/utils/pos/barcode/wedge";

/** Key times `gap` ms apart, starting at 0. */
const keys = (count: number, gap: number) => Array.from({ length: count }, (_, i) => i * gap);

describe("isScannerBurst", () => {
  it("reads a fast burst ending in Enter as a scan, whatever its length past the minimum", () => {
    expect(isScannerBurst(keys(13, 8), 13 * 8)).toBe(true);
    expect(isScannerBurst(keys(6, 20), 6 * 20)).toBe(true);
  });

  it("reads human typing as typing", () => {
    expect(isScannerBurst(keys(13, 90), 13 * 90)).toBe(false);
  });

  it("rejects a short burst, so a fast typist's word is never looked up", () => {
    expect(isScannerBurst(keys(5, 5), 25)).toBe(false);
  });

  it("rejects a burst with one slow key inside it", () => {
    const times = [0, 5, 10, 200, 205, 210];
    expect(isScannerBurst(times, 215)).toBe(false);
  });

  it("rejects an Enter pressed by hand after a burst", () => {
    expect(isScannerBurst(keys(8, 5), 35 + 400)).toBe(false);
  });
});

describe("isEditableTarget", () => {
  it("knows fields from the rest of the page", () => {
    expect(isEditableTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
