/** As much of a tax region as the rule reads; the backend's own shape fits it. */
export type TaxRegionRates = {
  country_code: string | null;
  province_code: string | null;
  parent_id: string | null;
  tax_rates?: { rate: number | null; is_default: boolean }[] | null;
};

/**
 * The VAT rate the store charges: the highest default rate among the country-level tax
 * regions of the store's countries (all of them when the store names none). 0 when no tax
 * region applies. Rates that override the default for single products are not the store's rate.
 */
export function storeVatRate(taxRegions: readonly TaxRegionRates[], countryCodes: readonly string[]): number {
  const countries = countryCodes.map((code) => code.toLowerCase());
  const rates = taxRegions
    .filter((region) => region.parent_id === null && !region.province_code)
    .filter((region) => countries.length === 0 || (!!region.country_code && countries.includes(region.country_code.toLowerCase())))
    .flatMap((region) => (region.tax_rates ?? []).filter((rate) => rate.is_default))
    .map((rate) => rate.rate ?? 0)
    .filter((rate) => Number.isFinite(rate));
  return Math.max(0, ...rates);
}

/**
 * "Prices include VAT" is said only when it is known to be true: a rate above zero.
 * No rate, no tax region, and a rate not loaded (or that failed to load) all read as no.
 */
export const pricesIncludeVat = (rate: number | undefined): boolean => rate !== undefined && rate > 0;
