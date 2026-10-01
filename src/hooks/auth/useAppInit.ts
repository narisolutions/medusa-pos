import { logger, safeStringify } from "@/utils/logger";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AdminUser } from "@medusajs/types";
import { AppConfig } from "@/types/utils";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useStoreManager } from "@/context/store-manager";
import storage from "@/utils/storage";
import { handleErrorToast } from "@/utils/helpers";
import { t } from "@/i18n";
import { runPostAuthInit } from "./postAuthInit";

// A rejected session is the only failure that ends a login; anything else may be transient.
const isUnauthorized = (error: unknown): boolean =>
  (error as { status?: number } | null)?.status === 401;

const useAppInit = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootMessage, setBootMessage] = useState(() => t("boot.starting"));

  const update = useUser((s) => s.update);
  const logout = useUser((s) => s.logout);

  // A retry starts a new run; the run it replaced must not touch state afterwards.
  const runId = useRef(0);

  const initApp = useCallback(async () => {
    const run = ++runId.current;
    const superseded = () => run !== runId.current;

    setBootLoading(true);

    try {
      setBootMessage(t("boot.loading_stores"));
      await useStoreManager.getState().loadStores();
      if (superseded()) return;
      const { activeStore } = useStoreManager.getState();

      if (!activeStore) {
        setConfig(null);
        update(null);
        return;
      }

      setConfig({ backend_url: activeStore.backendUrl });

      setBootMessage(t("boot.applying_theme"));
      const cachedTheme = await storage.getItem<{
        primaryColor?: string;
        secondaryColor?: string;
        fontScale?: string;
        brandName?: string;
      }>("store_theme");
      if (superseded()) return;
      if (cachedTheme) {
        const style = document.documentElement.style;
        if (cachedTheme.primaryColor) style.setProperty("--color-primary", cachedTheme.primaryColor);
        if (cachedTheme.secondaryColor) style.setProperty("--color-secondary", cachedTheme.secondaryColor);
        if (cachedTheme.fontScale) style.setProperty("--font-scale", cachedTheme.fontScale);
        document.title = cachedTheme.brandName ? `${cachedTheme.brandName} POS` : "POS";
      }

      const lastLogin = await storage.getItem("last_login");
      if (superseded() || !lastLogin) return;

      setBootMessage(t("boot.restoring_session"));
      try {
        const user = await getSdk().client.fetch<AdminUser>("/admin/users/me");
        if (superseded()) return;
        update(user);
      } catch (error) {
        if (superseded()) return;
        update(null);
        if (isUnauthorized(error)) {
          handleErrorToast(t("boot.session_expired"));
          await logout();
        } else {
          handleErrorToast(t("boot.user_fetch_failed"));
        }
        // Signed out either way: ProtectedRoute sends the user to sign-in, and there is
        // no session for the post-auth init below to use.
        return;
      }

      setBootMessage(t("boot.loading_settings"));
      await runPostAuthInit();
    } catch (err) {
      if (superseded()) return;
      // Not an auth failure, so the session is kept: logging out here would wipe a good
      // login over a transient error. The user is simply shown the sign-in screen.
      void logger.error(`App initialization failed: ${safeStringify(err)}`);
      setBootMessage(t("boot.init_failed"));
      setConfig(null);
      update(null);
      handleErrorToast(t("boot.init_failed"));
    } finally {
      if (!superseded()) setBootLoading(false);
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
