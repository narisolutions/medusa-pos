import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/plugin-log", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  attachConsole: vi.fn(),
}));

import { safeStringify } from "@/utils/logger";

describe("safeStringify", () => {
  it("keeps an Error's message and stack instead of printing {}", () => {
    const out = safeStringify(new Error("resource id 123 is invalid"));
    expect(out).toContain("resource id 123 is invalid");
    expect(out).toContain('"name": "Error"');
    expect(out).toContain("stack");
  });

  it("keeps the HTTP status and body our fetch attaches", () => {
    const error = Object.assign(new Error("HTTP 400: Bad Request"), { status: 400, body: { message: "bad" } });
    const parsed = JSON.parse(safeStringify(error));
    expect(parsed).toMatchObject({ message: "HTTP 400: Bad Request", status: 400, body: { message: "bad" } });
  });

  it("expands errors nested inside other values", () => {
    const out = safeStringify({ outcome: { error: new Error("deep") } });
    expect(out).toContain("deep");
  });

  it("prints strings, plain values and cycles without throwing", () => {
    expect(safeStringify("error sending request")).toBe('"error sending request"');
    expect(safeStringify(undefined)).toBe("undefined");
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(safeStringify(cyclic)).toContain("[Circular]");
  });
});
