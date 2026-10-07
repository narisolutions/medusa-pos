import { describe, it, expect } from "vitest";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import {
  catalogCategories,
  cheapestVariant,
  filterCatalog,
  otherVariants,
  productPriceRange,
  productStock,
  variantLabel,
  variantPrice,
} from "@/utils/pos/catalog";

type VariantSpec = {
  title?: string;
  sku?: string;
  ean?: string;
  barcode?: string;
  price?: number;
  stock?: number;
};

type CategorySpec = { id: string; name: string; parent?: { id: string; name: string } };

const product = (
  title: string,
  { categories = [], variants = [{}] }: { categories?: CategorySpec[]; variants?: VariantSpec[] } = {}
) =>
  ({
    id: `prod_${title}`,
    title,
    categories: categories.map(({ id, name, parent }) => ({
      id,
      name,
      parent_category_id: parent?.id ?? null,
      parent_category: parent ?? null,
    })),
    variants: variants.map((variant, index) => ({
      id: `var_${title}_${index}`,
      title: variant.title ?? "Default variant",
      sku: variant.sku ?? null,
      ean: variant.ean ?? null,
      barcode: variant.barcode ?? null,
      inventory_quantity: variant.stock,
      calculated_price: { calculated_amount: variant.price ?? 10 },
    })),
  }) as unknown as AdminProduct;

const WINE = { id: "cat_wine", name: "Wine" };
const RED = { id: "cat_red", name: "Red", parent: WINE };
const WHITE = { id: "cat_white", name: "White", parent: WINE };
const SPIRITS = { id: "cat_spirits", name: "Spirits" };

const saperavi = product("Saperavi", {
  categories: [RED],
  variants: [{ title: "2019", sku: "SAP-19", ean: "4860001" }, { title: "2021", sku: "SAP-21" }],
});
const rkatsiteli = product("Rkatsiteli", { categories: [WHITE] });
const chacha = product("Chacha", { categories: [SPIRITS], variants: [{ barcode: "4869999" }] });
const corkscrew = product("Corkscrew");
const catalog = [saperavi, rkatsiteli, chacha, corkscrew];

describe("catalogCategories", () => {
  it("rolls sub-categories up under their top-level parent, sorted by name", () => {
    expect(catalogCategories(catalog)).toEqual([
      { id: "cat_spirits", name: "Spirits", children: [] },
      {
        id: "cat_wine",
        name: "Wine",
        children: [
          { id: "cat_red", name: "Red" },
          { id: "cat_white", name: "White" },
        ],
      },
    ]);
  });

  it("lists a top-level category once however many products carry it", () => {
    const other = product("Mukuzani", { categories: [RED] });
    expect(catalogCategories([saperavi, other]).map((c) => c.id)).toEqual(["cat_wine"]);
  });

  it("returns nothing for uncategorised products", () => {
    expect(catalogCategories([corkscrew])).toEqual([]);
  });
});

describe("filterCatalog", () => {
  const titles = (products: AdminProduct[]) => products.map((p) => p.title);

  it("returns every product, sorted by title, without a filter", () => {
    expect(titles(filterCatalog(catalog, {}))).toEqual([
      "Chacha",
      "Corkscrew",
      "Rkatsiteli",
      "Saperavi",
    ]);
  });

  it("a parent category covers its children", () => {
    expect(titles(filterCatalog(catalog, { categoryId: "cat_wine" }))).toEqual([
      "Rkatsiteli",
      "Saperavi",
    ]);
  });

  it("a child category covers only itself", () => {
    expect(titles(filterCatalog(catalog, { categoryId: "cat_red" }))).toEqual(["Saperavi"]);
  });

  it("keeps uncategorised products out of every category", () => {
    expect(titles(filterCatalog(catalog, { categoryId: "cat_spirits" }))).toEqual(["Chacha"]);
  });

  it("matches the query on title, variant title, SKU and barcode", () => {
    expect(titles(filterCatalog(catalog, { query: "sape" }))).toEqual(["Saperavi"]);
    expect(titles(filterCatalog(catalog, { query: "2021" }))).toEqual(["Saperavi"]);
    expect(titles(filterCatalog(catalog, { query: "sap-19" }))).toEqual(["Saperavi"]);
    expect(titles(filterCatalog(catalog, { query: "4860001" }))).toEqual(["Saperavi"]);
    expect(titles(filterCatalog(catalog, { query: "4869999" }))).toEqual(["Chacha"]);
  });

  it("ignores case and diacritics", () => {
    const rose = product("Rosé Brut");
    expect(titles(filterCatalog([rose], { query: "ROSE" }))).toEqual(["Rosé Brut"]);
  });

  it("combines category and query", () => {
    expect(titles(filterCatalog(catalog, { categoryId: "cat_wine", query: "chacha" }))).toEqual([]);
  });
});

describe("productPriceRange", () => {
  it("spans the variant unit prices", () => {
    const p = product("P", { variants: [{ price: 30 }, { price: 12 }, { price: 18 }] });
    expect(productPriceRange(p)).toEqual({ min: 12, max: 30 });
  });

  it("is a single price for a single variant", () => {
    expect(productPriceRange(product("P", { variants: [{ price: 9 }] }))).toEqual({ min: 9, max: 9 });
  });

  it("is null without variants", () => {
    expect(productPriceRange(product("P", { variants: [] }))).toBeNull();
  });

  it("leaves out variants that cannot be sold", () => {
    const p = product("P", { variants: [{ price: 1, stock: 0 }, { price: 5, stock: 3 }, { price: 9 }] });
    expect(productPriceRange(p)).toEqual({ min: 5, max: 9 });
  });

  it("falls back to every variant when none can be sold", () => {
    const p = product("P", { variants: [{ price: 1, stock: 0 }, { price: 5, stock: 0 }] });
    expect(productPriceRange(p)).toEqual({ min: 1, max: 5 });
  });
});

describe("productStock", () => {
  it("is out only when every variant is out", () => {
    expect(productStock(product("P", { variants: [{ stock: 0 }, { stock: 0 }] }))).toBe("out");
    expect(productStock(product("P", { variants: [{ stock: 0 }, { stock: 20 }] }))).toBe("in");
  });

  it("is low when the total is five or fewer", () => {
    expect(productStock(product("P", { variants: [{ stock: 2 }, { stock: 3 }] }))).toBe("low");
    expect(productStock(product("P", { variants: [{ stock: 6 }] }))).toBe("in");
  });

  it("treats untracked stock as in stock", () => {
    expect(productStock(product("P", { variants: [{}] }))).toBe("in");
    expect(productStock(product("P", { variants: [{ stock: 0 }, {}] }))).toBe("in");
  });

  it("does not let negative stock offset other variants", () => {
    expect(productStock(product("P", { variants: [{ stock: -4 }, { stock: 0 }] }))).toBe("out");
  });

  it("is out without variants", () => {
    expect(productStock(product("P", { variants: [] }))).toBe("out");
  });
});

describe("variantPrice", () => {
  const variant = (calculated_price: object) =>
    ({ calculated_price }) as unknown as AdminProductVariant;

  it("shows the original beside a sale price", () => {
    const v = variant({
      calculated_amount: 8,
      original_amount: 10,
      calculated_price: { price_list_type: "sale" },
    });
    expect(variantPrice(v)).toEqual({ amount: 8, original: 10 });
  });

  it("has no original outside a sale", () => {
    const v = variant({
      calculated_amount: 8,
      original_amount: 10,
      calculated_price: { price_list_type: "override" },
    });
    expect(variantPrice(v)).toEqual({ amount: 8, original: null });
  });

  it("has no original when the sale price equals it", () => {
    const v = variant({
      calculated_amount: 10,
      original_amount: 10,
      calculated_price: { price_list_type: "sale" },
    });
    expect(variantPrice(v)).toEqual({ amount: 10, original: null });
  });
});

describe("cheapestVariant", () => {
  it("picks the lowest unit price, the first on a tie", () => {
    const p = product("P", { variants: [{ price: 20 }, { price: 12 }, { price: 12 }] });
    expect(cheapestVariant(p)?.id).toBe("var_P_1");
  });

  it("is null without variants", () => {
    expect(cheapestVariant(product("P", { variants: [] }))).toBeNull();
  });

  it("prefers a variant that can be sold", () => {
    const p = product("P", { variants: [{ price: 1, stock: 0 }, { price: 5, stock: 2 }] });
    expect(cheapestVariant(p)?.id).toBe("var_P_1");
  });
});

describe("variantLabel", () => {
  const variant = (title: string, values: string[] = []) =>
    ({ title, options: values.map((value) => ({ value })) }) as unknown as AdminProductVariant;

  it("joins the title and option values", () => {
    expect(variantLabel(variant("2019", ["750ml", "Dry"]))).toBe("2019 • 750ml/Dry");
  });

  it("drops Medusa's default title", () => {
    expect(variantLabel(variant("Default variant", ["750ml"]))).toBe("750ml");
    expect(variantLabel(variant("Default variant"))).toBe("");
  });
});

describe("otherVariants", () => {
  it("lists the rest of the variant's product", () => {
    expect(otherVariants(catalog, "var_Saperavi_0").map((v) => v.id)).toEqual(["var_Saperavi_1"]);
  });

  it("is empty for a single-variant product or an unknown variant", () => {
    expect(otherVariants(catalog, "var_Chacha_0")).toEqual([]);
    expect(otherVariants(catalog, "var_missing")).toEqual([]);
  });
});
