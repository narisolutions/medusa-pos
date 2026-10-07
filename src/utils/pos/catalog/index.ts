import { AdminProduct, AdminProductCategory, AdminProductVariant } from "@medusajs/types";
import { getVariantAvailableQuantity, getVariantUnitPrice } from "@/utils/pos/cart";

type CatalogCategory = {
  id: string;
  name: string;
  children: Array<{ id: string; name: string }>;
};

type CatalogFilter = {
  categoryId?: string | null;
  query?: string;
};

type ProductStock = "in" | "low" | "out";

const LOW_STOCK_THRESHOLD = 5;

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const parentId = (category: AdminProductCategory): string | null =>
  category.parent_category_id ?? category.parent_category?.id ?? null;

const catalogCategories = (products: AdminProduct[]): CatalogCategory[] => {
  const topLevel = new Map<string, CatalogCategory>();
  const childrenOf = new Map<string, Map<string, string>>();

  for (const product of products) {
    for (const category of product.categories ?? []) {
      const parent = parentId(category);
      if (!parent) {
        if (!topLevel.has(category.id)) {
          topLevel.set(category.id, { id: category.id, name: category.name, children: [] });
        }
        continue;
      }
      if (!topLevel.has(parent)) {
        topLevel.set(parent, {
          id: parent,
          name: category.parent_category?.name ?? "",
          children: [],
        });
      }
      const children = childrenOf.get(parent) ?? new Map<string, string>();
      children.set(category.id, category.name);
      childrenOf.set(parent, children);
    }
  }

  return [...topLevel.values()]
    .map((category) => ({
      ...category,
      children: [...(childrenOf.get(category.id) ?? [])]
        .map(([id, name]) => ({ id, name }))
        .sort(byName),
    }))
    .sort(byName);
};

const inCategory = (product: AdminProduct, categoryId: string) =>
  (product.categories ?? []).some(
    (category) => category.id === categoryId || parentId(category) === categoryId
  );

const matchesQuery = (product: AdminProduct, query: string) => {
  if (normalize(product.title ?? "").includes(query)) return true;
  return (product.variants ?? []).some((variant) =>
    [variant.title, variant.sku, variant.ean, variant.barcode].some(
      (field) => !!field && normalize(field).includes(query)
    )
  );
};

const filterCatalog = (
  products: AdminProduct[],
  { categoryId, query }: CatalogFilter
): AdminProduct[] => {
  const needle = normalize(query?.trim() ?? "");
  return products
    .filter((product) => !categoryId || inCategory(product, categoryId))
    .filter((product) => !needle || matchesQuery(product, needle))
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
};

/** The variants a price should name: those that can be sold, or all when none can. */
const pricedVariants = (product: AdminProduct): AdminProductVariant[] => {
  const variants = product.variants ?? [];
  const sellable = variants.filter((variant) => getVariantAvailableQuantity(variant) !== 0);
  return sellable.length > 0 ? sellable : variants;
};

const productPriceRange = (product: AdminProduct): { min: number; max: number } | null => {
  const prices = pricedVariants(product).map(getVariantUnitPrice);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

/** `original` is set only for a sale price that differs from it. */
const variantPrice = (variant: AdminProductVariant): { amount: number; original: number | null } => {
  const amount = getVariantUnitPrice(variant);
  const original = variant.calculated_price?.original_amount;
  const isSale = variant.calculated_price?.calculated_price?.price_list_type === "sale";
  return {
    amount,
    original: isSale && typeof original === "number" && original !== amount ? original : null,
  };
};

const cheapestVariant = (product: AdminProduct): AdminProductVariant | null =>
  pricedVariants(product).reduce<AdminProductVariant | null>(
    (cheapest, variant) =>
      !cheapest || getVariantUnitPrice(variant) < getVariantUnitPrice(cheapest) ? variant : cheapest,
    null
  );

/** What tells a variant apart: its title (Medusa's "Default variant" means none) and option values. */
const variantLabel = (variant: AdminProductVariant): string => {
  const title = variant.title && variant.title !== "Default variant" ? variant.title : "";
  const options = (variant.options ?? []).map((option) => option.value).filter(Boolean);
  return [title, options.join("/")].filter(Boolean).join(" • ");
};

/** The rest of the product a variant belongs to, in catalog order; empty when it stands alone. */
const otherVariants = (products: AdminProduct[], variantId: string): AdminProductVariant[] => {
  const product = products.find((p) => p.variants?.some((variant) => variant.id === variantId));
  return (product?.variants ?? []).filter((variant) => variant.id !== variantId);
};

const productStock = (product: AdminProduct): ProductStock => {
  const quantities = (product.variants ?? []).map(getVariantAvailableQuantity);
  if (quantities.length === 0) return "out";
  if (quantities.some((quantity) => quantity === undefined)) return "in";
  const total = quantities.reduce<number>((sum, quantity) => sum + Math.max(0, quantity ?? 0), 0);
  if (total === 0) return "out";
  return total <= LOW_STOCK_THRESHOLD ? "low" : "in";
};

export {
  catalogCategories,
  cheapestVariant,
  filterCatalog,
  otherVariants,
  productPriceRange,
  productStock,
  variantLabel,
  variantPrice,
};
export type { CatalogCategory, CatalogFilter, ProductStock };
