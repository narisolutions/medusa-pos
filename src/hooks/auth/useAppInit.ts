import { logger, safeStringify } from "@/utils/logger";
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
import { initDateTimePrefs, initCurrencyPrefs, loadPreferences } from "@/utils/settings/preferences";
import { queryClient, queryKeys } from "@/config/query";
import {
  getPrimaryColor,
  getSecondaryColor,
  getFontSize,
  getBrandName,
  getLogoUrl,
  hasPosMetadata,
} from "@/utils/settings/store/metadata";

// Post-auth init (store meta, theme, prefs, setup + sales-channel checks). Safe from
// boot and login flows; each section is wrapped so one failure never blocks the rest.
export async function runPostAuthInit() {
  try {
    const sdk = getSdk();
    const { stores } = await sdk.admin.store.list();
    const store = stores[0] as AdminStore | undefined;

    if (store) {
      const dismissed = await storage.getItem("store_setup_dismissed");
      useStore.getState().setNeedsSetup(!hasPosMetadata(store) && !dismissed);

      queryClient.setQueryData(queryKeys.store, store);

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
    void logger.error(`Store settings init failed: ${safeStringify(storeErr)}`);
  }

  try {
    const prefs = await loadPreferences();
    initDateTimePrefs(prefs.dateTime);
    initCurrencyPrefs(prefs.currency);
  } catch (prefsErr) {
    void logger.error(`Preferences init failed: ${safeStringify(prefsErr)}`);
  }

  try {
    const storedId = await storage.getItem("sales_channel_id");
    let validId: string | undefined;

    if (storedId) {
      try {
        const sdk = getSdk();
        const { sales_channels } = await sdk.admin.salesChannel.list();
        const exists = sales_channels.some((ch: { id: string }) => ch.id === storedId);
        if (exists) {
          validId = storedId;
        } else {
          await storage.setItem("sales_channel_id", "");
        }
      } catch {
        validId = storedId;
      }
    }

    useSalesChannel.getState().setSalesChannelId(validId);
    useSalesChannel.getState().setNeedsWarning(!validId);
  } catch (scErr) {
    void logger.error(`Sales channel init failed: ${safeStringify(scErr)}`);
    useSalesChannel.getState().setNeedsWarning(true);
  }
}

const useAppInit = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootMessage, setBootMessage] = useState("Starting…");

  const update = useUser((s) => s.update);
  const logout = useUser((s) => s.logout);

  const currentPath = window.location.pathname;
  const isAuthRoute = currentPath === "/sign-in";

  const initApp = useCallback(async () => {
    setBootLoading(true);

    try {
      setBootMessage("Loading store configuration…");
      await useStoreManager.getState().loadStores();
      const { activeStore } = useStoreManager.getState();

      if (!activeStore) {
        setConfig(null);
        update(null);
        return;
      }

      setConfig({ backend_url: activeStore.backendUrl });

      setBootMessage("Applying theme…");
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

      const lastLogin = await storage.getItem("last_login");
      if (!lastLogin) return;

      try {
        setBootMessage("Restoring session…");
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

      setBootMessage("Loading store settings…");
      await runPostAuthInit();
    } catch (err) {
      void logger.error(`App initialization failed: ${safeStringify(err)}`);
      setBootMessage("Initialization failed");
      setConfig(null);
      update(null);
      await logout();
      if (!isAuthRoute) {
        window.location.href = "/sign-in";
      }
    } finally {
      setBootLoading(false);
    }
  }, [logout, update, isAuthRoute]);

  useEffect(() => {
    // Defer to a microtask so initApp's initial state updates don't run
    // synchronously within this effect (they then behave as async updates).
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) initApp();
    });
    return () => {
      cancelled = true;
    };
  }, [initApp]);

  const isReady = useMemo(() => !!config && !bootLoading, [config, bootLoading]);

  const retry = useCallback(() => {
    initApp();
  }, [initApp]);

  return { config, bootLoading, bootMessage, isReady, retry };
};

export default useAppInit;
