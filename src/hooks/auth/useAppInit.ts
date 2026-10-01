import { logger, safeStringify } from "@/utils/logger";
import { useEffect, useState, useCallback, useRef } from "react";
import { AdminUser } from "@medusajs/types";
import { toast } from "sonner";
import { getSdk, setUnauthorizedHandler } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useStoreManager } from "@/context/store-manager";
import storage from "@/utils/storage";
import { t } from "@/i18n";
import { queryClient } from "@/config/query";
import { resetPosPluginCache } from "@/utils/pos/plugin";
import { runPostAuthInit } from "./postAuthInit";
import { bootApp, verifyOfflineSession, type BootDeps, type BootMessage, type CachedTheme } from "./bootApp";

const OFFLINE_RECHECK_MS = 10_000;

const bootText = (message: BootMessage) => t(`boot.${message}`);

const fetchMe = () => getSdk().client.fetch<AdminUser>("/admin/users/me");

// The id keeps the same message from stacking when two paths report it at once.
const notify: BootDeps["notify"] = (message, tone) =>
  toast[tone === "error" ? "error" : "info"](bootText(message), { id: `boot-${message}` });

// One logout at a time: the 401 handler and the offline re-check can both end a session.
let endingSession: Promise<void> | null = null;
const endSession = (logout: () => Promise<void>) => {
  endingSession ??= logout().finally(() => {
    endingSession = null;
  });
  return endingSession;
};

const applyCachedTheme = (theme: CachedTheme) => {
  const style = document.documentElement.style;
  if (theme.primaryColor) style.setProperty("--color-primary", theme.primaryColor);
  if (theme.secondaryColor) style.setProperty("--color-secondary", theme.secondaryColor);
  if (theme.fontScale) style.setProperty("--font-scale", theme.fontScale);
  document.title = theme.brandName ? `${theme.brandName} POS` : "POS";
};

const useAppInit = () => {
  const [bootLoading, setBootLoading] = useState(true);
  const [bootMessage, setBootMessage] = useState(() => bootText("starting"));
  const [offlineSession, setOfflineSession] = useState(false);

  const update = useUser((s) => s.update);
  const signOut = useUser((s) => s.logout);
  const logout = useCallback(() => endSession(signOut), [signOut]);

  // A retry starts a new run; the run it replaced must not touch state afterwards.
  const runId = useRef(0);

  const initApp = useCallback(async () => {
    const run = ++runId.current;
    const isSuperseded = () => run !== runId.current;

    setBootLoading(true);
    setOfflineSession(false);
    try {
      const result = await bootApp({
        loadStores: () => useStoreManager.getState().loadStores(),
        getActiveBackendUrl: () => useStoreManager.getState().activeStore?.backendUrl,
        readCachedTheme: () => storage.getItem<CachedTheme>("store_theme"),
        applyTheme: applyCachedTheme,
        readLastLogin: () => storage.getItem("last_login"),
        fetchMe,
        readCachedAdmin: () => storage.getItem<AdminUser>("last_admin"),
        runPostAuthInit,
        logout,
        setUser: update,
        setMessage: (message) => setBootMessage(bootText(message)),
        notify,
        logError: (error) => void logger.error(`App initialization failed: ${safeStringify(error)}`),
        isSuperseded,
      });
      if (!isSuperseded()) setOfflineSession(result.offlineSession);
    } finally {
      if (!isSuperseded()) setBootLoading(false);
    }
  }, [logout, update]);

  // A token the backend stops accepting mid-session (expired, revoked) signs the operator out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!useUser.getState().isAuthenticated) return;
      notify("session_expired", "error");
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

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

  // A session the boot could not verify is re-checked until the backend answers, so it
  // neither stays "signed in" on a dead token nor waits for a manual refresh.
  useEffect(() => {
    if (!offlineSession) return;
    let stopped = false;
    let busy = false;

    const recheck = async () => {
      if (busy || stopped) return;
      busy = true;
      const outcome = await verifyOfflineSession({
        fetchMe,
        setUser: update,
        notify,
        logout,
        runPostAuthInit,
      });
      busy = false;
      if (outcome === "verified") {
        // Everything that failed while the backend was out of reach loads again by itself.
        resetPosPluginCache();
        void queryClient.invalidateQueries();
      }
      if (outcome !== "pending" && !stopped) setOfflineSession(false);
    };

    const timer = setInterval(recheck, OFFLINE_RECHECK_MS);
    window.addEventListener("online", recheck);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", recheck);
    };
  }, [offlineSession, update, logout]);

  const retry = useCallback(() => {
    initApp();
  }, [initApp]);

  return { bootLoading, bootMessage, retry };
};

export default useAppInit;
