import { logger, safeStringify } from "@/utils/logger";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AdminUser } from "@medusajs/types";
import { toast } from "sonner";
import { AppConfig } from "@/types/utils";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useStoreManager } from "@/context/store-manager";
import storage from "@/utils/storage";
import { t } from "@/i18n";
import { runPostAuthInit } from "./postAuthInit";
import { bootApp, type BootMessage, type CachedTheme } from "./bootApp";

const bootText = (message: BootMessage) => t(`boot.${message}`);

const applyCachedTheme = (theme: CachedTheme) => {
  const style = document.documentElement.style;
  if (theme.primaryColor) style.setProperty("--color-primary", theme.primaryColor);
  if (theme.secondaryColor) style.setProperty("--color-secondary", theme.secondaryColor);
  if (theme.fontScale) style.setProperty("--font-scale", theme.fontScale);
  document.title = theme.brandName ? `${theme.brandName} POS` : "POS";
};

const useAppInit = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootMessage, setBootMessage] = useState(() => bootText("starting"));

  const update = useUser((s) => s.update);
  const logout = useUser((s) => s.logout);

  // A retry starts a new run; the run it replaced must not touch state afterwards.
  const runId = useRef(0);

  const initApp = useCallback(async () => {
    const run = ++runId.current;
    const isSuperseded = () => run !== runId.current;

    setBootLoading(true);
    try {
      await bootApp({
        loadStores: () => useStoreManager.getState().loadStores(),
        getActiveBackendUrl: () => useStoreManager.getState().activeStore?.backendUrl,
        readCachedTheme: () => storage.getItem<CachedTheme>("store_theme"),
        applyTheme: applyCachedTheme,
        readLastLogin: () => storage.getItem("last_login"),
        fetchMe: () => getSdk().client.fetch<AdminUser>("/admin/users/me"),
        readCachedAdmin: () => storage.getItem<AdminUser>("last_admin"),
        runPostAuthInit,
        logout,
        setConfig,
        setUser: update,
        setMessage: (message) => setBootMessage(bootText(message)),
        notify: (message, tone) => toast[tone === "error" ? "error" : "info"](bootText(message)),
        logError: (error) => void logger.error(`App initialization failed: ${safeStringify(error)}`),
        isSuperseded,
      });
    } finally {
      if (!isSuperseded()) setBootLoading(false);
    }
  }, [logout, update]);

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
