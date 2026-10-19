// The reasons Medusa seeds into every store (payment module migration, 2025-09), by code.
const MEDUSA_DEFAULT_REASONS: Record<string, string> = {
  shipping_issue: "Shipping Issue",
  customer_care_adjustment: "Customer Care Adjustment",
  pricing_error: "Pricing Error",
};

/**
 * The i18n key for a refund reason Medusa seeded and the store left as is. A reason the store
 * created or renamed has no key: its own label is the store's wording.
 */
function defaultRefundReasonKey(reason: { code?: string | null; label: string }): string | undefined {
  if (!reason.code || MEDUSA_DEFAULT_REASONS[reason.code] !== reason.label) return undefined;
  return `orders.refund_reason_defaults.${reason.code}`;
}

export { defaultRefundReasonKey };
