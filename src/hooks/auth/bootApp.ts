import type { AdminUser } from "@medusajs/types";
import type { AppConfig } from "@/types/utils";

export type CachedTheme = {
  primaryColor?: string;
  secondaryColor?: string;
  fontScale?: string;
  brandName?: string;
};

/** Every message the boot can show; each maps to `boot.<key>` in the locale files. */
export type BootMessage =
  | "starting"
  | "loading_stores"
  | "applying_theme"
  | "restoring_session"
  | "loading_settings"
  | "init_failed"
  | "session_expired"
  | "user_fetch_failed"
  | "restored_offline";

/** Everything the boot touches, injected so the flow can be tested without a DOM. */
export type BootDeps = {
  loadStores: () => Promise<void>;
  getActiveBackendUrl: () => string | undefined;
  readCachedTheme: () => Promise<CachedTheme | undefined>;
  applyTheme: (theme: CachedTheme) => void;
  readLastLogin: () => Promise<number | undefined>;
  fetchMe: () => Promise<AdminUser>;
  readCachedAdmin: () => Promise<AdminUser | undefined>;
  runPostAuthInit: () => Promise<void>;
  logout: () => Promise<void>;
  setConfig: (config: AppConfig | null) => void;
  setUser: (user: AdminUser | null) => void;
  setMessage: (message: BootMessage) => void;
  notify: (message: BootMessage, tone: "error" | "info") => void;
  logError: (error: unknown) => void;
  /** True once a retry has replaced this run; a replaced run must not touch anything. */
  isSuperseded: () => boolean;
};

const statusOf = (error: unknown): number | undefined =>
  (error as { status?: number } | null)?.status;

// A rejected session is the only failure that ends a login.
const isUnauthorized = (error: unknown) => statusOf(error) === 401;

// No answer at all (offline) or the backend failing says nothing about the session.
const isUnverifiable = (error: unknown) => {
  const status = statusOf(error);
  return status === undefined || status >= 500;
};

export type BootResult = {
  /** The session could not be verified and the cached admin stands in until it can be. */
  offlineSession: boolean;
};

/**
 * One attempt to confirm a session the boot could not verify. Confirmed: the real user
 * replaces the cached one and the post-auth init that was skipped runs now. Rejected: the
 * session is over. Anything else: still unreachable, try again later.
 */
export async function verifyOfflineSession(
  deps: Pick<BootDeps, "fetchMe" | "setUser" | "notify" | "logout" | "runPostAuthInit">
): Promise<"verified" | "expired" | "pending"> {
  try {
    deps.setUser(await deps.fetchMe());
    await deps.runPostAuthInit();
    return "verified";
  } catch (error) {
    if (!isUnauthorized(error)) return "pending";
    deps.setUser(null);
    deps.notify("session_expired", "error");
    await deps.logout();
    return "expired";
  }
}

/**
 * The app's startup: theme, then restore the saved session, then the post-auth init.
 * A session that cannot be verified because the backend is unreachable falls back to
 * the admin cached at the last login, so a short outage does not force a re-login.
 * `offlineSession` tells the caller to keep re-checking (see verifyOfflineSession), since
 * nothing else ends a session whose token turns out to be dead.
 */
export async function bootApp(deps: BootDeps): Promise<BootResult> {
  const none: BootResult = { offlineSession: false };
  let offlineSession = false;
  try {
    deps.setMessage("loading_stores");
    await deps.loadStores();
    if (deps.isSuperseded()) return none;

    const backendUrl = deps.getActiveBackendUrl();
    if (backendUrl === undefined) {
      deps.setConfig(null);
      deps.setUser(null);
      return none;
    }
    deps.setConfig({ backend_url: backendUrl });

    deps.setMessage("applying_theme");
    const theme = await deps.readCachedTheme();
    if (deps.isSuperseded()) return none;
    if (theme) deps.applyTheme(theme);

    const lastLogin = await deps.readLastLogin();
    if (deps.isSuperseded() || !lastLogin) return none;

    deps.setMessage("restoring_session");
    try {
      const user = await deps.fetchMe();
      if (deps.isSuperseded()) return none;
      deps.setUser(user);
    } catch (error) {
      if (deps.isSuperseded()) return none;

      if (isUnauthorized(error)) {
        deps.setUser(null);
        deps.notify("session_expired", "error");
        await deps.logout();
        return none;
      }

      const cached = isUnverifiable(error) ? await deps.readCachedAdmin() : undefined;
      if (deps.isSuperseded()) return none;
      if (!cached) {
        deps.setUser(null);
        deps.notify("user_fetch_failed", "error");
        return none;
      }
      deps.setUser(cached);
      deps.notify("restored_offline", "info");
      offlineSession = true;
    }

    deps.setMessage("loading_settings");
    await deps.runPostAuthInit();
    return { offlineSession };
  } catch (error) {
    if (deps.isSuperseded()) return none;
    // Not an auth failure, so the session is kept: logging out here would wipe a good
    // login over a transient error. The user is simply shown the sign-in screen.
    deps.logError(error);
    deps.setMessage("init_failed");
    deps.setConfig(null);
    deps.setUser(null);
    deps.notify("init_failed", "error");
    return none;
  }
}
