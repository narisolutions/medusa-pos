import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { useTranslation } from "@/i18n";
import { handleErrorToast } from "@/utils/helpers";
import { playErrorSound, playSuccessSound } from "@/utils/sounds";
import { catalogCategories, filterCatalog } from "@/utils/pos/catalog";
import { loadPreferences, updatePreferences } from "@/utils/settings/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/settings/preferences/defaults";
import { logger, safeStringify } from "@/utils/logger";
import type { CatalogView } from "@/types/preferences";
import type { ProductPickerResult } from "@/components/base/product-picker/hooks";

interface Props {
  products: AdminProduct[];
  onSelect: (variant: AdminProductVariant) => ProductPickerResult;
}

const useCatalogPanel = ({ products, onSelect }: Props) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [topCategoryId, setTopCategoryId] = useState<string | null>(null);
  const [childCategoryId, setChildCategoryId] = useState<string | null>(null);
  const [chooserProduct, setChooserProduct] = useState<AdminProduct | null>(null);
  const [view, setView] = useState<CatalogView>(DEFAULT_PREFERENCES.display.catalogView);

  useEffect(() => {
    let cancelled = false;
    loadPreferences().then((prefs) => {
      if (!cancelled) setView(prefs.display.catalogView);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeView = (next: CatalogView) => {
    setView(next);
    updatePreferences({ display: { catalogView: next } }).catch((error) =>
      logger.warn(`Failed to save catalog view: ${safeStringify(error)}`)
    );
  };

  const categories = useMemo(() => catalogCategories(products), [products]);
  const selectedTopCategory = categories.find((category) => category.id === topCategoryId) ?? null;

  const visibleProducts = useMemo(
    () => filterCatalog(products, { categoryId: childCategoryId ?? topCategoryId, query }),
    [products, childCategoryId, topCategoryId, query]
  );

  const selectTopCategory = (id: string | null) => {
    setTopCategoryId(id);
    setChildCategoryId(null);
  };

  const toggleChildCategory = (id: string) => {
    setChildCategoryId((current) => (current === id ? null : id));
  };

  const addVariant = useCallback(
    (variant: AdminProductVariant, product: AdminProduct): boolean => {
      const result = onSelect({ ...variant, product });
      if (!result.success) {
        handleErrorToast(result.message || t("checkout.cannot_add_to_cart"));
        playErrorSound();
        return false;
      }
      if (result.message) toast.success(result.message);
      playSuccessSound();
      return true;
    },
    [onSelect, t]
  );

  const handleProduct = (product: AdminProduct) => {
    const variants = product.variants ?? [];
    if (variants.length === 1) {
      addVariant(variants[0], product);
      return;
    }
    if (variants.length > 1) setChooserProduct(product);
  };

  return {
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
    hasFilter: !!query.trim(),
    handleProduct,
    addVariant,
    chooserProduct,
    closeChooser: () => setChooserProduct(null),
  };
};

export { useCatalogPanel };
