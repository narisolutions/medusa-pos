import { z } from "zod";

/**
 * What the till tells the customer display: an allowlist, never a filtered internal
 * object. Every message is the whole screen, so a missed one heals with the next.
 */

const money = z.number().finite();

/** Photos come only over https; the mapper checks with this same schema, so the two can't disagree. */
export const displayImageUrlSchema = z.url({ protocol: /^https$/ });

/** About 300 KB of picture: the store's logo travels inside the welcome screen. */
export const MAX_LOGO_CHARS = 400_000;

/** The store's logo: an address, or the picture itself as the store settings save it. */
export const displayLogoUrlSchema = z.union([
  z.url({ protocol: /^https?$/ }),
  z
    .string()
    .max(MAX_LOGO_CHARS)
    .regex(/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/),
]);

export const displayLineSchema = z.object({
  key: z.string(),
  title: z.string().max(120),
  subtitle: z.string().max(120).optional(),
  /** Not an integer by contract: a weighed item is 0.35, and one odd line must not blank the screen. */
  quantity: z.number().finite().positive(),
  unitPrice: money,
  originalUnitPrice: money.optional(),
  lineTotal: money,
  discountLabel: z.string().max(40).optional(),
  thumbnailUrl: displayImageUrlSchema.optional(),
});

export const displayTotalsSchema = z.object({
  itemCount: z.number().finite().nonnegative(),
  subtotal: money,
  discount: money,
  total: money,
  /** Known only once the backend has priced the sale, at payment; absent when it charged none. */
  vatIncluded: money.positive().optional(),
  /** Lines left out of a very long cart; the totals still count them. */
  hiddenLines: z.number().int().nonnegative(),
});

export const displayBrandingSchema = z.object({
  storeName: z.string(),
  primaryColor: z.string().max(40).optional(),
});

export const displayFormatSchema = z.object({
  currency: z.string().length(3),
  symbolPosition: z.enum(["before", "after"]),
  decimalSeparator: z.enum(["dot", "comma"]),
  /** A supported locale, or "ka+en" for Georgian with English underneath. */
  language: z.string().max(10),
  theme: z.enum(["light", "dark"]),
  /** True only when the store is known to charge VAT; the cart screen says so only then. */
  pricesIncludeVat: z.boolean(),
  showImages: z.boolean(),
});

const base = {
  v: z.literal(1),
  seq: z.number().int().positive(),
  sentAt: z.number(),
  branding: displayBrandingSchema,
  format: displayFormatSchema,
};

export const displayPaymentMethodSchema = z.enum(["cash", "card", "transfer", "bank_transfer"]);

export const displayStateSchema = z.discriminatedUnion("phase", [
  // The logo rides only on the screen that shows it, not on every scan.
  z.object({ ...base, phase: z.literal("idle"), logoUrl: displayLogoUrlSchema.optional() }),
  z.object({ ...base, phase: z.literal("cart"), lines: z.array(displayLineSchema), totals: displayTotalsSchema }),
  z.object({
    ...base,
    phase: z.literal("payment_pending"),
    lines: z.array(displayLineSchema),
    totals: displayTotalsSchema,
    method: displayPaymentMethodSchema,
    amountDue: money,
    /** The exact total when cash rounding changed it. */
    roundedFrom: money.optional(),
    tendered: money.optional(),
    change: money.optional(),
  }),
  z.object({
    ...base,
    phase: z.literal("payment_success"),
    total: money,
    change: money.optional(),
    outstanding: z.boolean(),
  }),
  z.object({ ...base, phase: z.literal("payment_failed"), total: money }),
]);
