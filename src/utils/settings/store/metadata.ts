import { AdminStore } from "@medusajs/types";

export type PaymentMethodConfig = {
  id: string;
  label: string;
  enabled: boolean;
  icon?: "cash" | "card";
  /** Drives payment processing behavior (numpad, change calc, confirmation dialog). */
  type?: "cash" | "card";
};

/** POS-specific store settings, nested under metadata.pos */
export type PosMetadata = {
  brand_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  font_size?: string;
  store_address?: string;
  store_address_2?: string;
  store_phone?: string;
  payment_methods?: PaymentMethodConfig[];
  guest_customer_email?: string;
};

/** Raw store metadata shape (may have pos object and/or legacy flat keys) */
type RawStoreMetadata = Record<string, unknown> & {
  pos?: PosMetadata;
  brand_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  font_size?: string;
  store_address?: string;
  store_address_2?: string;
  store_phone?: string;
  payment_methods?: PaymentMethodConfig[];
  guest_customer_email?: string;
};

const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: "pp_cash_pos", label: "Cash", enabled: true, icon: "cash", type: "cash" },
  { id: "pp_manual_pos", label: "Card", enabled: true, icon: "card", type: "card" },
];

/** Returns true if store has POS data (pos object or legacy flat keys) */
export function hasPosMetadata(store: AdminStore | null | undefined): boolean {
  const raw = (store?.metadata ?? {}) as RawStoreMetadata;
  return !!(
    raw.pos?.brand_name ??
    raw.brand_name ??
    raw.pos?.logo_url ??
    raw.logo_url
  );
}

/** Returns POS metadata, reading from metadata.pos with fallback to legacy flat keys */
export function getStoreMetadata(
  store: AdminStore | null | undefined
): PosMetadata {
  const raw = (store?.metadata ?? {}) as RawStoreMetadata;
  const pos = raw.pos ?? {};
  return {
    brand_name: pos.brand_name ?? raw.brand_name,
    logo_url: pos.logo_url ?? raw.logo_url,
    primary_color: pos.primary_color ?? raw.primary_color,
    secondary_color: pos.secondary_color ?? raw.secondary_color,
    font_size: pos.font_size ?? raw.font_size,
    store_address: pos.store_address ?? raw.store_address,
    store_address_2: pos.store_address_2 ?? raw.store_address_2,
    store_phone: pos.store_phone ?? raw.store_phone,
    payment_methods: pos.payment_methods ?? raw.payment_methods,
    guest_customer_email: pos.guest_customer_email ?? raw.guest_customer_email,
  };
}

export function getBrandName(
  store: AdminStore | null | undefined
): string {
  return getStoreMetadata(store).brand_name ?? store?.name ?? "";
}

export function getLogoUrl(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).logo_url;
}

export function getPrimaryColor(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).primary_color;
}

export function getSecondaryColor(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).secondary_color;
}

export function getFontSize(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).font_size;
}

export function getStoreAddress(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).store_address;
}

export function getStoreAddress2(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).store_address_2;
}

export function getStorePhone(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).store_phone;
}

export function getGuestCustomerEmail(
  store: AdminStore | null | undefined
): string | undefined {
  return getStoreMetadata(store).guest_customer_email;
}

/** Returns enabled payment methods for checkout. Falls back to defaults when not configured. */
export function getPaymentMethods(
  store: AdminStore | null | undefined
): PaymentMethodConfig[] {
  const configured = getStoreMetadata(store).payment_methods;
  if (!configured?.length) return DEFAULT_PAYMENT_METHODS.filter((p) => p.enabled);
  return configured.filter((p) => p.enabled);
}

/** Returns all payment methods for settings UI (including disabled). */
export function getPaymentMethodsForSettings(
  store: AdminStore | null | undefined
): PaymentMethodConfig[] {
  const configured = getStoreMetadata(store).payment_methods;
  if (!configured?.length) return [...DEFAULT_PAYMENT_METHODS];
  return configured;
}

const POS_METADATA_KEYS = new Set([
  "brand_name",
  "logo_url",
  "primary_color",
  "secondary_color",
  "font_size",
  "store_address",
  "store_address_2",
  "store_phone",
  "payment_methods",
   "guest_customer_email",
  "pos",
]);

/** Build metadata payload with pos object, stripping legacy flat keys from top level */
export function buildStoreMetadataPayload(
  existingMetadata: Record<string, unknown> | undefined,
  pos: PosMetadata
): Record<string, unknown> {
  const existing = existingMetadata ?? {};
  const rest = Object.fromEntries(
    Object.entries(existing).filter(([key]) => !POS_METADATA_KEYS.has(key))
  );
  return { ...rest, pos };
}

/**
 * Returns the behavioral type ("cash" or "card") for a given provider ID.
 * Falls back from the explicit `type` field to the `icon` field for legacy saved configs.
 * Defaults to "card" when the method is not found.
 */
export function getMethodType(
  store: AdminStore | null | undefined,
  providerId: string | undefined
): "cash" | "card" {
  if (!providerId) return "card";
  const configured = getStoreMetadata(store).payment_methods;
  const all = configured?.length ? configured : DEFAULT_PAYMENT_METHODS;
  const found = all.find((m) => m.id === providerId);
  if (!found) return "card";
  return found.type ?? (found.icon === "cash" ? "cash" : "card");
}

export { DEFAULT_PAYMENT_METHODS };
