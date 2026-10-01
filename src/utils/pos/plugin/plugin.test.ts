import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/config/medusa", () => ({ getSdk: () => ({ client: { fetch: h.fetch } }) }));

import { isInconclusiveProbe, isPosPluginInstalled, resetPosPluginCache } from ".";

const httpError = (status?: number) => Object.assign(new Error("fail"), { status });

beforeEach(() => {
  vi.clearAllMocks();
  resetPosPluginCache();
});

describe("isPosPluginInstalled", () => {
  it("is true when the health route answers, and asks only once", async () => {
    h.fetch.mockResolvedValue({});
    expect(await isPosPluginInstalled()).toBe(true);
    expect(await isPosPluginInstalled()).toBe(true);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([[404], [405], [403]])("is false when the backend answers %s", async (status) => {
    h.fetch.mockRejectedValue(httpError(status));
    expect(await isPosPluginInstalled()).toBe(false);
  });

  it.each([[undefined], [500], [503]])(
    "does not claim the plugin is missing, or remember that, when there was no usable answer (%s)",
    async (status) => {
      h.fetch.mockRejectedValueOnce(httpError(status));
      await expect(isPosPluginInstalled()).rejects.toThrow();

      h.fetch.mockResolvedValue({});
      expect(await isPosPluginInstalled()).toBe(true);
      expect(h.fetch).toHaveBeenCalledTimes(2);
    }
  );
});

describe("isInconclusiveProbe", () => {
  it("treats a missing status and server errors as inconclusive, other statuses as answers", () => {
    expect(isInconclusiveProbe(httpError(undefined))).toBe(true);
    expect(isInconclusiveProbe(httpError(502))).toBe(true);
    expect(isInconclusiveProbe(httpError(404))).toBe(false);
    expect(isInconclusiveProbe(null)).toBe(true);
  });
});
