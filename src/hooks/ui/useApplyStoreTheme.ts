import { useEffect } from "react";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getPrimaryColor, getSecondaryColor, getFontSize, getBrandName } from "@/utils/store/metadata";

const useApplyStoreTheme = () => {
  const { data: store } = useQueryStore();

  useEffect(() => {
    const primaryColor = getPrimaryColor(store);
    const secondaryColor = getSecondaryColor(store);
    const fontScale = getFontSize(store);
    const brandName = getBrandName(store);

    if (primaryColor) {
      document.documentElement.style.setProperty("--color-primary", primaryColor);
    } else {
      document.documentElement.style.removeProperty("--color-primary");
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty("--color-secondary", secondaryColor);
    } else {
      document.documentElement.style.removeProperty("--color-secondary");
    }
    if (fontScale) {
      document.documentElement.style.setProperty("--font-scale", fontScale);
    } else {
      document.documentElement.style.removeProperty("--font-scale");
    }
    document.title = brandName ? `${brandName} POS` : "POS";
  }, [store]);
};

export default useApplyStoreTheme;
