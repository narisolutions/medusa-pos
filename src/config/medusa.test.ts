import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const disk: Record<string, unknown> = {};
  const store = {
    get: vi.fn(async (key: string) => disk[key]),
    set: vi.fn(async (key: string, value: unknown) => void (disk[key] = value)),
    delete: vi.fn(async (key: string) => void delete disk[key]),
    save: vi.fn(async () => {}),
  };
  return { disk, store, local: new Map<string, string>(), logWarn: vi.fn() };
});

vi.mock("@tauri-apps/plugin-store", () => ({ Store: { load: vi.fn(async () => h.store) } }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/utils/logger", () => ({ logger: { warn: h.logWarn, error: vi.fn() }, safeStringify: String }));

import { clearAuthTokenCache, clearStoredAuthToken, getAuthToken, setAuthTokenCache } from "./medusa";

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(h.disk)) delete h.disk[key];
  h.local.clear();
  clearAuthTokenCache();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => h.local.get(k) ?? null,
    setItem: (k: string, v: string) => void h.local.set(k, v),
    removeItem: (k: string) => void h.local.delete(k),
  });
});

describe("the stored login token", () => {
  it("is read back from disk when only the memory cache is cleared (the old behaviour)", async () => {
    h.disk.medusa_auth_token = "jwt-from-disk";
    setAuthTokenCache("jwt-from-disk");
    clearAuthTokenCache();

    expect(await getAuthToken()).toBe("jwt-from-disk");
  });

  it("is gone from the cache, the Tauri store and localStorage once cleared", async () => {
    h.disk.medusa_auth_token = "jwt";
    h.local.set("medusa_auth_token", "jwt");
    setAuthTokenCache("jwt");

    await clearStoredAuthToken();

    expect(h.disk.medusa_auth_token).toBeUndefined();
    expect(h.local.has("medusa_auth_token")).toBe(false);
    expect(h.store.save).toHaveBeenCalled();
    expect(await getAuthToken()).toBeNull();
  });

  it("still clears the rest when the Tauri store cannot be reached", async () => {
    h.local.set("medusa_auth_token", "jwt");
    setAuthTokenCache("jwt");
    h.store.delete.mockRejectedValueOnce(new Error("store unavailable"));

    await clearStoredAuthToken();

    expect(h.local.has("medusa_auth_token")).toBe(false);
    expect(h.logWarn).toHaveBeenCalledWith(expect.stringContaining("Failed to remove the stored auth token"));
  });
});
