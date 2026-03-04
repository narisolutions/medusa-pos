import { useEffect, useState, useMemo, useCallback } from "react";
import { AdminStore, AdminUser } from "@medusajs/types";
import { AppConfig } from "@/types/utils";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useStore } from "@/context/store";
import { useSalesChannel } from "@/context/sales-channel";
import { useStoreManager } from "@/context/store-manager";
import storage from "@/utils/storage";
import { handleErrorToast } from "@/utils/helpers";
import { queryClient } from "@/config/query";
import { STORE_QUERY_KEY } from "@/hooks/queries/useQueryStore";
import {
  getPrimaryColor,
  getSecondaryColor,
  getFontSize,
  getBrandName,
  getLogoUrl,
  hasPosMetadata,
} from "@/utils/store/metadata";

const useAppInit = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  const update = useUser((s) => s.update);
  const logout = useUser((s) => s.logout);
  const setNeedsSetup = useStore((s) => s.setNeedsSetup);
  const setSalesChannelId = useSalesChannel((s) => s.setSalesChannelId);
  const setNeedsSalesChannelWarning = useSalesChannel((s) => s.setNeedsWarning);

  const currentPath = window.location.pathname;
  const isAuthRoute = currentPath === "/sign-in";

  const initApp = useCallback(async () => {
    setBootLoading(true);

    try {
      // 1. Hydrate store manager
      await useStoreManager.getState().loadStores();
      const { activeStore } = useStoreManager.getState();

      if (!activeStore) {
        setConfig(null);
        update(null);
        return;
      }

      setConfig({ backend_url: activeStore.backendUrl });

      // 2. Restore cached theme for the login page before session is confirmed
      const cachedTheme = await storage.getItem<{
        primaryColor?: string;
        secondaryColor?: string;
        fontScale?: string;
        brandName?: string;
      }>("store_theme");
      if (cachedTheme) {
        if (cachedTheme.primaryColor) document.documentElement.style.setProperty("--color-primary", cachedTheme.primaryColor);
        if (cachedTheme.secondaryColor) document.documentElement.style.setProperty("--color-secondary", cachedTheme.secondaryColor);
        if (cachedTheme.fontScale) document.documentElement.style.setProperty("--font-scale", cachedTheme.fontScale);
        document.title = cachedTheme.brandName ? `${cachedTheme.brandName} POS` : "POS";
      }

      // 3. Hydrate user session
      const lastLogin = await storage.getItem("last_login");
      if (!lastLogin) return;

      try {
        const user = await getSdk().client.fetch<AdminUser>("/admin/users/me");
        update(user);
      } catch (error) {
        const status = (error as { status?: number })?.status;
        update(null);
        if (status === 401) {
          handleErrorToast("Session expired. Please log in again.");
          await logout();
          window.location.href = "/sign-in";
        } else {
          handleErrorToast("Failed to fetch user. Please try again.");
        }
      }

      // 4. Load Medusa store — prime cache, apply theme, determine setup state
      try {
        const sdk = getSdk();
        const { stores } = await sdk.admin.store.list();
        const store = stores[0] as AdminStore | undefined;

        if (store) {
          const dismissed = await storage.getItem("store_setup_dismissed");
          setNeedsSetup(!hasPosMetadata(store) && !dismissed);

          queryClient.setQueryData(STORE_QUERY_KEY, store);

          await useStoreManager.getState().updateActiveName(store.name);
          await useStoreManager.getState().updateActiveLogo(getLogoUrl(store));

          const primaryColor = getPrimaryColor(store);
          const secondaryColor = getSecondaryColor(store);
          const fontScale = getFontSize(store);

          if (primaryColor) document.documentElement.style.setProperty("--color-primary", primaryColor);
          else document.documentElement.style.removeProperty("--color-primary");
          if (secondaryColor) document.documentElement.style.setProperty("--color-secondary", secondaryColor);
          else document.documentElement.style.removeProperty("--color-secondary");
          if (fontScale) document.documentElement.style.setProperty("--font-scale", fontScale);
          else document.documentElement.style.removeProperty("--font-scale");

          await storage.setItem("store_theme", {
            primaryColor: primaryColor ?? undefined,
            secondaryColor: secondaryColor ?? undefined,
            fontScale: fontScale ?? undefined,
            brandName: getBrandName(store) || undefined,
          });
        }
      } catch (storeErr) {
        console.error("Store settings init failed:", storeErr);
      }

      // 5. Load sales channel config
      const salesChannelId = await storage.getItem("sales_channel_id");
      setSalesChannelId(salesChannelId);
      setNeedsSalesChannelWarning(!salesChannelId);
    } catch (err) {
      console.error("App initialization failed:", err);
      setConfig(null);
      update(null);
      await logout();
      if (!isAuthRoute) {
        window.location.href = "/sign-in";
      }
    } finally {
      setBootLoading(false);
    }
  }, [logout, update, isAuthRoute, setNeedsSetup, setSalesChannelId, setNeedsSalesChannelWarning]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const isReady = useMemo(() => !!config && !bootLoading, [config, bootLoading]);

  return { config, bootLoading, isReady };
};

export default useAppInit;
