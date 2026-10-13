import { describe, it, expect } from "vitest";
import { printerStatusIntent, readPrinterStatus } from "@/utils/pos/printer-status";

describe("readPrinterStatus", () => {
  it("reads the fixed-high idle bytes as ready", () => {
    expect(readPrinterStatus(0x12, 0x12)).toBe("ready");
    expect(readPrinterStatus(0x16, 0x12)).toBe("ready");
  });

  it("names what stops printing, the most urgent first", () => {
    expect(readPrinterStatus(0x12 | 0x20, 0x12 | 0x60)).toBe("cover_open");
    expect(readPrinterStatus(0x12, 0x12 | 0x60)).toBe("paper_out");
    expect(readPrinterStatus(0x12 | 0x40, 0x12)).toBe("error");
    expect(readPrinterStatus(0x12 | 0x08, 0x12)).toBe("offline");
  });

  it("warns on a low roll, which still prints", () => {
    expect(readPrinterStatus(0x12, 0x12 | 0x0c)).toBe("paper_low");
    expect(printerStatusIntent("paper_low")).toBe("warning");
  });

  it("treats a head that answers nothing as connected, not failed", () => {
    expect(readPrinterStatus(null, null)).toBe("connected");
    expect(readPrinterStatus(null, 0x12)).toBe("ready");
  });
});
