import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n";
import { useBarcodeBackgroundPaste } from "@/hooks/barcode/useBarcodePaste";
import { useDebounce } from "@/hooks/ui/useDebounce";
import { useCartStore } from "@/context/cart";
import { toast } from "sonner";
import { handleErrorToast } from "@/utils/helpers";
import { playErrorSound, playSuccessSound } from "@/utils/sounds";
import { queryClient } from "@/config/query";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import constants from "@/utils/constants";
import { fetchProductByBarcode } from "@/hooks/queries/useQueryProductByBarcode";
import { ExtendedAdminProduct } from "@/types/utils";
import { useSalesChannel } from "@/context/sales-channel";

const BARCODE_PATTERN = constants.CHECKOUT_CONFIG.BARCODE_VALIDATION_PATTERN;
const INITIAL_MODE = "search" as const;

interface FilterState {
  filterValue: string;
  inputValue: string;
  mode: "search" | "barcode";
  showDropdown: boolean;
  isProcessing: boolean;
}

const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

interface Props {
  products?: AdminProduct[];
  inputRef?: React.RefObject<HTMLInputElement>;
}

const useCheckoutFilter = (props?: Props) => {
  const { products = [], inputRef } = props || {};
  const { t } = useTranslation();
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const setNeedsWarning = useSalesChannel((s) => s.setNeedsWarning);
  const [filterState, setFilterState] = useState<FilterState>({
    filterValue: "",
    inputValue: "",
    mode: INITIAL_MODE,
    showDropdown: false,
    isProcessing: false,
  });

  const { addItem: addItemToCart } = useCartStore();

  // Helper function to update state partially
  const updateFilterState = useCallback((updates: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Destructure state for easier access
  const { filterValue, inputValue, mode, showDropdown, isProcessing } =
    filterState;

  const debouncedInputValue = useDebounce(
    inputValue,
    constants.CHECKOUT_CONFIG.SEARCH_DEBOUNCE_MS
  );

  const filteredVariants = useMemo(() => {
    if (!debouncedInputValue || mode === "barcode") {
      return [];
    }

    const searchText = debouncedInputValue.toLowerCase();
    const variants = [];

    for (const product of products) {
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const variantWithProduct = { ...variant, product };
          variants.push(variantWithProduct);
        }
      }
    }

    return variants
      .filter((variant) => {
        return (
          variant.product?.title?.toLowerCase().includes(searchText) ||
          variant.title?.toLowerCase().includes(searchText) ||
          variant.sku?.toLowerCase().includes(searchText) ||
          variant.ean?.toLowerCase().includes(searchText)
        );
      })
      .slice(0, constants.CHECKOUT_CONFIG.SEARCH_RESULTS_LIMIT);
  }, [products, debouncedInputValue, mode]);

  const handleAddToCart = useCallback(
    async (variant: AdminProductVariant & { product: AdminProduct }) => {
      if (isProcessing) return;

      try {
        updateFilterState({ isProcessing: true });

        const result = addItemToCart(variant);

        if (!result.success) {
          handleErrorToast(result.message || t("checkout.cannot_add_to_cart"));
          playErrorSound();
          return;
        }

        const itemTitle = variant.product?.title || variant.title;
        const message =
          result.action === "added"
            ? t("checkout.item_added", { title: itemTitle })
            : t("checkout.quantity_increased", { title: itemTitle });

        toast.success(message);
        playSuccessSound();

        updateFilterState({
          inputValue: "",
          filterValue: "",
          mode: INITIAL_MODE,
          showDropdown: false,
        });
      } catch (error) {
        handleErrorToast(error);
        playErrorSound();
      } finally {
        updateFilterState({ isProcessing: false });
      }
    },
    [isProcessing, addItemToCart, updateFilterState, t]
  );

  const handleBarcodeSubmit = useCallback(
    async (barcode: string) => {
      if (isProcessing || !barcode) return;

      if (!salesChannelId) {
        setNeedsWarning(true);
        toast.error(t("checkout.no_sales_channel_configured"));
        playErrorSound();
        return;
      }

      try {
        updateFilterState({ isProcessing: true });

        let productVariant = null;
        productVariant = await queryClient.fetchQuery({
          queryKey: ["product-by-barcode", barcode],
          queryFn: () => fetchProductByBarcode(barcode),
        });

        if (!productVariant) {
          playErrorSound();
          handleErrorToast(t("checkout.product_not_found"));
          setFilterState((prev) => ({ ...prev, inputValue: "" }));
          return;
        }

        const result = addItemToCart(productVariant);

        if (!result.success) {
          handleErrorToast(result.message || t("checkout.cannot_add_to_cart"));
          playErrorSound();
          return;
        }

        const itemTitle = productVariant.product?.title || productVariant.title;
        const message =
          result.action === "added"
            ? t("checkout.item_added", { title: itemTitle })
            : t("checkout.quantity_increased", { title: itemTitle });

        toast.success(message);
        playSuccessSound();

        updateFilterState({
          inputValue: "",
          mode: INITIAL_MODE,
          filterValue: "",
        });
      } catch (error) {
        handleErrorToast(error);
        playErrorSound();
      } finally {
        updateFilterState({ isProcessing: false });
      }
    },
    [
      isProcessing,
      addItemToCart,
      updateFilterState,
      salesChannelId,
      setNeedsWarning,
      t,
    ]
  );

  useBarcodeBackgroundPaste({
    onBarcodePaste: handleBarcodeSubmit,
    onKeystroke: (key: string) => {
      // Handle global keystokes - will focus input and let it handle the key
      if (key === "Backspace") {
        const currentValue = inputValue;
        if (currentValue.length > 0) {
          handleInputChange(currentValue.slice(0, -1));
        }
      } else {
        handleInputChange(inputValue + key);
      }
    },
    inputRef,
    enabled: !isProcessing,
  });

  const handleInputChange = useCallback(
    (value: string) => {
      if (BARCODE_PATTERN.test(value.trim())) {
        updateFilterState({
          inputValue: value,
          mode: "barcode",
          filterValue: "",
          showDropdown: false,
        });
      } else {
        const newFilterValue = value.toLowerCase();
        updateFilterState({
          inputValue: value,
          mode: "search",
          filterValue: newFilterValue,
          showDropdown: value.length > 0,
        });
      }
    },
    [updateFilterState]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        mode === "barcode" &&
        BARCODE_PATTERN.test(inputValue.trim())
      ) {
        handleBarcodeSubmit(inputValue.trim());
      }
    },
    [mode, inputValue, handleBarcodeSubmit]
  );

  const handleClear = useCallback(() => {
    updateFilterState({
      inputValue: "",
      filterValue: "",
      mode: INITIAL_MODE,
      showDropdown: false,
    });
  }, [updateFilterState]);

  const getBrandTitle = (product: ExtendedAdminProduct): string | null => {
    const brand = product?.metadata?.brand || product?.brand || null;
    const rawTitle = brand?.title || brand?.name || null;

    if (!rawTitle) return null;
    if (typeof rawTitle === "string") return rawTitle;
    if (typeof rawTitle === "object") {
      const localized = rawTitle as Record<string, string>;
      return localized.en || Object.values(localized)[0] || null;
    }
    return null;
  };

  // Computed values
  const isValidBarcode = BARCODE_PATTERN.test(inputValue.trim());
  const showClearButton = inputValue.length > 0;
  const isButtonEnabled = mode === "barcode" && isValidBarcode;

  return {
    // State
    inputValue,
    mode,
    filterValue,

    // Status flags
    isProcessing,
    isValidBarcode,
    showClearButton,
    isButtonEnabled,
    showDropdown,

    // Handlers
    handleInputChange,
    handleKeyDown,
    handleClear,
    handleBarcodeSubmit,
    handleAddToCart,

    // Data
    filteredVariants,

    // State management
    updateFilterState,

    // Utility functions
    handleMouseDown,
    getInputPlaceholder: () =>
      mode === "search"
        ? t("checkout.search_placeholder")
        : t("checkout.barcode_placeholder"),
    getBrandTitle,
  };
};

export { useCheckoutFilter };
