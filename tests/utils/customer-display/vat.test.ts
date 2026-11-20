import { describe, expect, it } from "vitest";
import { pricesIncludeVat, storeVatRate, type TaxRegionRates } from "@/utils/customer-display/vat";

const region = (country: string, rates: [number | null, boolean][], overrides: Partial<TaxRegionRates> = {}): TaxRegionRates => ({
  country_code: country,
  province_code: null,
  parent_id: null,
  tax_rates: rates.map(([rate, is_default]) => ({ rate, is_default })),
  ...overrides,
});

describe("whether the cart screen says prices include VAT", () => {
  it("says so for a store with a tax rate above zero", () => {
    expect(pricesIncludeVat(storeVatRate([region("ge", [[18, true]])], ["ge"]))).toBe(true);
  });

  it("says nothing for a store with a zero rate, or with no tax region", () => {
    expect(pricesIncludeVat(storeVatRate([region("ge", [[0, true]])], ["ge"]))).toBe(false);
    expect(pricesIncludeVat(storeVatRate([], ["ge"]))).toBe(false);
  });

  it("says nothing while the rate is loading, or when it could not be read", () => {
    expect(pricesIncludeVat(undefined)).toBe(false);
  });
});

describe("storeVatRate", () => {
  it("is the default rate of the store's own country", () => {
    const regions = [region("ge", [[18, true]]), region("de", [[19, true]])];
    expect(storeVatRate(regions, ["GE"])).toBe(18);
    expect(storeVatRate(regions, ["am"])).toBe(0);
  });

  it("ignores rates that override the default for single products", () => {
    expect(storeVatRate([region("ge", [[0, true], [18, false]])], ["ge"])).toBe(0);
  });

  it("ignores province-level regions", () => {
    const province = region("us", [[9, true]], { province_code: "ca", parent_id: "txreg_us" });
    expect(storeVatRate([region("us", [[0, true]]), province], ["us"])).toBe(0);
  });

  it("takes the highest when the store sells in several countries, and every region when it names none", () => {
    const regions = [region("ge", [[18, true]]), region("am", [[20, true]])];
    expect(storeVatRate(regions, ["ge", "am"])).toBe(20);
    expect(storeVatRate(regions, [])).toBe(20);
  });

  it("reads a missing rate, or a region without rates, as zero", () => {
    expect(storeVatRate([region("ge", [[null, true]]), { ...region("ge", []), tax_rates: null }], ["ge"])).toBe(0);
  });
});
