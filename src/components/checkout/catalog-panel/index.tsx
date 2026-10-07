import React from "react";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { LayoutGrid, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductPickerResult } from "@/components/base/product-picker/hooks";
import { formatPrice } from "@/utils/helpers";
import { useTranslation } from "@/i18n";
import { useCheckout } from "../hooks";
import { useCatalogPanel } from "./hooks";
import ProductTile from "./product-tile";
import ProductRow from "./product-row";
import VariantChooser from "./variant-chooser";

interface Props {
  open: boolean;
  onClose: () => void;
  products: AdminProduct[];
  onSelect: (variant: AdminProductVariant) => ProductPickerResult;
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const Chip: React.FC<ChipProps> = ({ selected, onClick, children }) => (
  <Button
    type="button"
    variant={selected ? "default" : "outline"}
    aria-pressed={selected}
    onClick={onClick}
    className="rounded-full px-5"
  >
    {children}
  </Button>
);

const CatalogPanel: React.FC<Props> = ({ open, onClose, products, onSelect }) => {
  const { t } = useTranslation();
  const { items, getTotal, currency } = useCheckout();
  const {
    view,
    changeView,
    query,
    setQuery,
    categories,
    topCategoryId,
    childCategoryId,
    selectedTopCategory,
    selectTopCategory,
    toggleChildCategory,
    visibleProducts,
    hasFilter,
    handleProduct,
    addVariant,
    chooserProduct,
    closeChooser,
  } = useCatalogPanel({ products, onSelect });

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    // Kept mounted while closed so the filter survives a close and reopen.
    <section
      aria-label={t("checkout.catalog_title")}
      hidden={!open}
      className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-lg border border-theme-border bg-(--color-bg-base) shadow-lg animate-in fade-in-0 slide-in-from-left-4 duration-200"
    >
        <div className="flex items-center gap-4 border-b border-theme-border bg-surface px-6 py-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-xl font-semibold text-fg">{t("checkout.catalog_title")}</h2>
            <p className="truncate text-base text-fg-muted">
              {t("checkout.catalog_cart_summary", {
                count: itemCount,
                total: formatPrice(getTotal(), currency),
              })}
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-theme-border p-1">
            <Button
              type="button"
              variant={view === "cards" ? "default" : "ghost"}
              aria-pressed={view === "cards"}
              onClick={() => changeView("cards")}
            >
              <LayoutGrid className="size-5" />
              {t("checkout.catalog_cards")}
            </Button>
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              aria-pressed={view === "list"}
              onClick={() => changeView("list")}
            >
              <List className="size-5" />
              {t("checkout.catalog_list")}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("checkout.catalog_close")}
          >
            <X className="size-6" />
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-b border-theme-border bg-surface px-6 py-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("checkout.catalog_search_placeholder")}
            className="text-base"
          />
          <div className="flex flex-wrap gap-2">
            <Chip selected={!topCategoryId} onClick={() => selectTopCategory(null)}>
              {t("checkout.catalog_all")}
            </Chip>
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={category.id === topCategoryId}
                onClick={() => selectTopCategory(category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </div>
          {selectedTopCategory && selectedTopCategory.children.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTopCategory.children.map((child) => (
                <Chip
                  key={child.id}
                  selected={child.id === childCategoryId}
                  onClick={() => toggleChildCategory(child.id)}
                >
                  {child.name}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {visibleProducts.length === 0 ? (
            <p className="py-12 text-center text-lg text-fg-muted">
              {hasFilter ? t("checkout.catalog_no_matches") : t("checkout.catalog_empty_category")}
            </p>
          ) : view === "list" ? (
            <div className="flex flex-col gap-2">
              {visibleProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  currency={currency}
                  onPick={handleProduct}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
              {visibleProducts.map((product) => (
                <ProductTile
                  key={product.id}
                  product={product}
                  currency={currency}
                  onPick={handleProduct}
                />
              ))}
            </div>
          )}
        </div>
      <VariantChooser
        product={chooserProduct}
        currency={currency}
        onClose={closeChooser}
        onPick={addVariant}
      />
    </section>
  );
};

export default CatalogPanel;
