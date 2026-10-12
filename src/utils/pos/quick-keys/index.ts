import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import type { QuickKey } from "@/utils/settings/store/metadata";

type ResolvedQuickKey = {
  key: QuickKey;
  /** With its product attached, as Checkout's add path expects. */
  variant: AdminProductVariant & { product: AdminProduct };
};

/**
 * The quick keys this till can sell: each matched to a loaded variant. A key whose variant
 * isn't in the loaded catalogue (unpublished, another sales channel, deleted) is left out.
 */
const resolveQuickKeys = (keys: QuickKey[], products: AdminProduct[]): ResolvedQuickKey[] => {
  const byVariant = new Map<string, ResolvedQuickKey["variant"]>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      byVariant.set(variant.id, { ...variant, product });
    }
  }
  return keys.flatMap((key) => {
    const variant = byVariant.get(key.variant_id);
    return variant ? [{ key, variant }] : [];
  });
};

/** What a key's button says: its own short label, else the product (and variant) name. */
const quickKeyLabel = (key: QuickKey, variant: AdminProductVariant & { product?: AdminProduct | null }): string => {
  const own = key.label?.trim();
  if (own) return own;
  const productTitle = variant.product?.title ?? "";
  const variantTitle = variant.title && variant.title !== "Default variant" ? variant.title : "";
  return [productTitle, variantTitle].filter(Boolean).join(" · ") || variant.sku || variant.id;
};

export { resolveQuickKeys, quickKeyLabel };
export type { ResolvedQuickKey };
