import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  storeList: vi.fn(),
  channelList: vi.fn(),
  storage: { getItem: vi.fn(), setItem: vi.fn() },
  setNeedsSetup: vi.fn(),
  setSalesChannelId: vi.fn(),
  setNeedsWarning: vi.fn(),
  updateActiveName: vi.fn(),
  updateActiveLogo: vi.fn(),
  loadPreferences: vi.fn(),
  initDateTimePrefs: vi.fn(),
  initCurrencyPrefs: vi.fn(),
  setQueryData: vi.fn(),
  logError: vi.fn(),
  style: { setProperty: vi.fn(), removeProperty: vi.fn() },
}));

vi.mock("@/config/medusa", () => ({
  getSdk: () => ({ admin: { store: { list: h.storeList }, salesChannel: { list: h.channelList } } }),
}));
vi.mock("@/context/store", () => ({ useStore: { getState: () => ({ setNeedsSetup: h.setNeedsSetup }) } }));
vi.mock("@/context/sales-channel", () => ({
  useSalesChannel: { getState: () => ({ setSalesChannelId: h.setSalesChannelId, setNeedsWarning: h.setNeedsWarning }) },
}));
vi.mock("@/context/store-manager", () => ({
  useStoreManager: { getState: () => ({ updateActiveName: h.updateActiveName, updateActiveLogo: h.updateActiveLogo }) },
}));
vi.mock("@/utils/storage", () => ({ default: h.storage }));
vi.mock("@/utils/settings/preferences", () => ({
  loadPreferences: h.loadPreferences,
  initDateTimePrefs: h.initDateTimePrefs,
  initCurrencyPrefs: h.initCurrencyPrefs,
}));
vi.mock("@/config/query", () => ({ queryClient: { setQueryData: h.setQueryData }, queryKeys: { store: ["store"] } }));
vi.mock("@/utils/logger", () => ({ logger: { error: h.logError }, safeStringify: String }));

import { runPostAuthInit } from "@/utils/auth/post-auth-init";

const store = {
  name: "Wineland",
  metadata: { pos: { brand_name: "Wineland", primary_color: "#d1604b", font_size: "16" } },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("document", { documentElement: { style: h.style } });
  h.storeList.mockResolvedValue({ stores: [store] });
  h.channelList.mockResolvedValue({ sales_channels: [{ id: "sc_1" }] });
  h.loadPreferences.mockResolvedValue({ dateTime: { d: 1 }, currency: { c: 1 } });
  h.storage.getItem.mockImplementation(async (key: string) => (key === "sales_channel_id" ? "sc_1" : undefined));
});

describe("runPostAuthInit", () => {
  it("applies the store's theme and caches it for the next boot", async () => {
    await runPostAuthInit();

    expect(h.style.setProperty).toHaveBeenCalledWith("--color-primary", "#d1604b");
    expect(h.style.removeProperty).toHaveBeenCalledWith("--color-secondary");
    expect(h.storage.setItem).toHaveBeenCalledWith(
      "store_theme",
      expect.objectContaining({ primaryColor: "#d1604b", brandName: "Wineland" })
    );
    expect(h.setNeedsSetup).toHaveBeenCalledWith(false);
  });

  it("asks for setup when the store has no POS metadata and setup was not dismissed", async () => {
    h.storeList.mockResolvedValue({ stores: [{ name: "Bare", metadata: {} }] });
    await runPostAuthInit();
    expect(h.setNeedsSetup).toHaveBeenCalledWith(true);
  });

  it("keeps the other sections working when the store request fails", async () => {
    h.storeList.mockRejectedValue(new Error("boom"));
    await runPostAuthInit();

    expect(h.logError).toHaveBeenCalledWith(expect.stringContaining("Store settings init failed"));
    expect(h.initDateTimePrefs).toHaveBeenCalled();
    expect(h.setSalesChannelId).toHaveBeenCalledWith("sc_1");
  });

  it("keeps the store and channel sections working when preferences fail", async () => {
    h.loadPreferences.mockRejectedValue(new Error("boom"));
    await runPostAuthInit();

    expect(h.logError).toHaveBeenCalledWith(expect.stringContaining("Preferences init failed"));
    expect(h.setQueryData).toHaveBeenCalled();
    expect(h.setSalesChannelId).toHaveBeenCalledWith("sc_1");
  });

  it("forgets a saved sales channel that no longer exists, and warns", async () => {
    h.channelList.mockResolvedValue({ sales_channels: [{ id: "other" }] });
    await runPostAuthInit();

    expect(h.storage.setItem).toHaveBeenCalledWith("sales_channel_id", "");
    expect(h.setSalesChannelId).toHaveBeenCalledWith(undefined);
    expect(h.setNeedsWarning).toHaveBeenCalledWith(true);
  });

  it("keeps the saved sales channel when it cannot be verified", async () => {
    h.channelList.mockRejectedValue(new Error("offline"));
    await runPostAuthInit();

    expect(h.setSalesChannelId).toHaveBeenCalledWith("sc_1");
    expect(h.setNeedsWarning).toHaveBeenCalledWith(false);
    expect(h.storage.setItem).not.toHaveBeenCalledWith("sales_channel_id", "");
  });

  it("warns when no sales channel was ever chosen", async () => {
    h.storage.getItem.mockResolvedValue(undefined);
    await runPostAuthInit();

    expect(h.channelList).not.toHaveBeenCalled();
    expect(h.setNeedsWarning).toHaveBeenCalledWith(true);
  });
});
