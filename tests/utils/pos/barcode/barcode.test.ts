import { describe, it, expect, vi, beforeEach } from "vitest";

const { sdk, plugin } = vi.hoisted(() => ({
  sdk: { client: { fetch: vi.fn() } },
  plugin: { installed: true },
}));
vi.mock("@/config/medusa", () => ({ getSdk: () => sdk }));
vi.mock("@/utils/pos/plugin", () => ({ isPosPluginInstalled: async () => plugin.installed }));
vi.mock("@/i18n", () => ({ t: (key: string) => key }));

import { fetchProductByBarcode } from "@/utils/pos/barcode";

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

beforeEach(() => {
  vi.clearAllMocks();
  plugin.installed = true;
});

describe("fetchProductByBarcode", () => {
  it("asks for the code in the given sales channel", async () => {
    sdk.client.fetch.mockResolvedValue({
      id: "prod_1",
      title: "Saperavi",
      handle: "saperavi",
      images: [{ url: "https://cdn/s.jpg" }],
      variants: [{ id: "variant_1", title: "0.75L", prices: [] }],
    });

    const variant = await fetchProductByBarcode("4860001234567", "sc_vake");

    expect(sdk.client.fetch).toHaveBeenCalledWith("/pos/product-by-barcode/sc_vake/4860001234567");
    expect(variant).toMatchObject({
      id: "variant_1",
      product: { id: "prod_1", title: "Saperavi", thumbnail: "https://cdn/s.jpg" },
    });
  });

  it("escapes a code that is not plain digits", async () => {
    sdk.client.fetch.mockResolvedValue({ variants: [] });
    await fetchProductByBarcode("A/B 1", "sc_vake");
    expect(sdk.client.fetch).toHaveBeenCalledWith("/pos/product-by-barcode/sc_vake/A%2FB%201");
  });

  it("reads a 404 or an empty product as an unknown barcode", async () => {
    sdk.client.fetch.mockRejectedValueOnce(httpError(404));
    await expect(fetchProductByBarcode("1", "sc")).resolves.toBeNull();

    sdk.client.fetch.mockResolvedValueOnce({ variants: [] });
    await expect(fetchProductByBarcode("1", "sc")).resolves.toBeNull();
  });

  it("throws any other failure instead of calling it not found", async () => {
    sdk.client.fetch.mockRejectedValue(httpError(500));
    await expect(fetchProductByBarcode("1", "sc")).rejects.toMatchObject({ status: 500 });
  });

  it("says why when the POS plugin is missing", async () => {
    plugin.installed = false;
    await expect(fetchProductByBarcode("1", "sc")).rejects.toThrow(
      "checkout.barcode_custom_endpoints_disabled"
    );
    expect(sdk.client.fetch).not.toHaveBeenCalled();
  });
});
