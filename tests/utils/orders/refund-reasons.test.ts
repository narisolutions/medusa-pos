import { describe, it, expect } from "vitest";
import { defaultRefundReasonKey } from "@/utils/orders/refund-reasons";
import en from "@/i18n/locales/en.json";
import ka from "@/i18n/locales/ka.json";
import pl from "@/i18n/locales/pl.json";
import es from "@/i18n/locales/es.json";
import fr from "@/i18n/locales/fr.json";
import de from "@/i18n/locales/de.json";
import sv from "@/i18n/locales/sv.json";

describe("defaultRefundReasonKey", () => {
  it("translates a reason Medusa seeded and the store left as is", () => {
    expect(defaultRefundReasonKey({ code: "pricing_error", label: "Pricing Error" })).toBe(
      "orders.refund_reason_defaults.pricing_error"
    );
  });

  it("keeps the store's wording for a renamed or its own reason", () => {
    expect(defaultRefundReasonKey({ code: "pricing_error", label: "Wrong price on the shelf" })).toBeUndefined();
    expect(defaultRefundReasonKey({ code: "damaged", label: "Damaged" })).toBeUndefined();
    expect(defaultRefundReasonKey({ label: "Pricing Error" })).toBeUndefined();
  });

  it("has every default in all 7 locales", () => {
    for (const locale of [en, ka, pl, es, fr, de, sv]) {
      expect(Object.keys(locale.orders.refund_reason_defaults).sort()).toEqual(
        ["customer_care_adjustment", "pricing_error", "shipping_issue"]
      );
    }
  });
});
