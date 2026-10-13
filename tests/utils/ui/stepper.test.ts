import { describe, it, expect } from "vitest";
import { stepValue } from "@/utils/ui/stepper";

describe("stepValue", () => {
  it("moves by the step", () => {
    expect(stepValue(2, 1)).toBe(3);
    expect(stepValue(2, -1, { step: 2 })).toBe(0);
  });

  it("stays within the limits, and reports when it can't move", () => {
    expect(stepValue(1, -1, { min: 1 })).toBeNull();
    expect(stepValue(9, 1, { max: 10, step: 5 })).toBe(10);
    expect(stepValue(10, 1, { max: 10 })).toBeNull();
  });
  it("never moves an over-limit value the wrong way", () => {
    expect(stepValue(5, 1, { max: 3 })).toBeNull();
    expect(stepValue(5, -1, { max: 3 })).toBe(3);
    expect(stepValue(-2, -1, { min: 0 })).toBeNull();
  });
});
