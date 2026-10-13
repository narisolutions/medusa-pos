import React from "react";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { LayoutGrid, List, PackageSearch, X } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/state-panel";
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
          <SegmentedControl
            label={t("checkout.catalog_view")}
            value={view}
            onChange={changeView}
            options={[
              { value: "cards", label: t("checkout.catalog_cards"), icon: <LayoutGrid /> },
              { value: "list", label: t("checkout.catalog_list"), icon: <List /> },
            ]}
          />
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
            clearable
            aria-label={t("checkout.catalog_search_placeholder")}
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
            <EmptyState
              icon={<PackageSearch />}
              title={hasFilter ? t("checkout.catalog_no_matches") : t("checkout.catalog_empty_category")}
            />
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
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
