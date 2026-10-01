import { logger, safeStringify } from "@/utils/logger";
import { invoke } from "@tauri-apps/api/core";
import constants from "@/utils/constants";
import type Medusa from "@medusajs/js-sdk";
import { logRequest } from "./requestLog";
import { createSdkFetch } from "./sdkFetch";

const AUTH_TOKEN_KEY = "medusa_auth_token";

// In-memory token cache — spares every request a Store.load + IPC round-trip.
// Safe: the JWT is static per login; updated on token store, cleared on logout/reset.
let cachedAuthToken: string | null = null;

export const setAuthTokenCache = (token: string | null): void => {
  cachedAuthToken = token;
};

export const clearAuthTokenCache = (): void => {
  cachedAuthToken = null;
};

/**
 * Removes the login token everywhere it is kept: the memory cache, the Tauri store and
 * any localStorage copy left by older versions. Clearing only the cache is not enough —
 * getAuthToken() reads the disk copy back, so a logged-out terminal would keep a valid
 * token, and a token issued by one backend would be sent to the next one after a backend change.
 */
export const clearStoredAuthToken = async (): Promise<void> => {
  clearAuthTokenCache();
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // localStorage unavailable: nothing was kept there
  }
  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load(".auth.dat");
    await store.delete(AUTH_TOKEN_KEY);
    await store.save();
  } catch (error) {
    void logger.warn(`Failed to remove the stored auth token: ${safeStringify(error)}`);
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  if (cachedAuthToken) return cachedAuthToken;
  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load(".auth.dat");
    const token = await store.get<string>(AUTH_TOKEN_KEY);
    if (token) {
      cachedAuthToken = token;
      return token;
    }
    // Older versions also kept the token in localStorage: move it into the store once.
    const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (localToken) {
      await store.set(AUTH_TOKEN_KEY, localToken);
      await store.save();
      localStorage.removeItem(AUTH_TOKEN_KEY);
      cachedAuthToken = localToken;
    }
    return localToken;
  } catch {
    return null;
  }
};

const storeAuthToken = async (token: string): Promise<void> => {
  setAuthTokenCache(token);
  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load(".auth.dat");
    await store.set(AUTH_TOKEN_KEY, token);
    await store.save();
  } catch (error) {
    // The session still works until the app restarts; only the saved copy is missing.
    void logger.error(`Failed to store auth token: ${safeStringify(error)}`);
  }
};

let unauthorizedHandler: (() => void) | null = null;

/** Called when the backend rejects the session token mid-session (see createSdkFetch). */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

let sdkInstance: InstanceType<typeof Medusa> | null = null;
let sdkBaseUrl: string | null = null;
let sdkInitPromise: Promise<InstanceType<typeof Medusa>> | null = null;

export const initializeSdk = (baseUrl?: string): Promise<InstanceType<typeof Medusa>> => {
  if (sdkInstance) {
    return Promise.resolve(sdkInstance);
  }

  // Single-flight: concurrent callers share one init. A failure clears the memo so
  // the next call can retry; waiters receive the rejection instead of a null instance.
  if (!sdkInitPromise) {
    sdkInitPromise = createSdk(baseUrl).catch((error) => {
      sdkInitPromise = null;
      throw error;
    });
  }

  return sdkInitPromise;
};

const createSdk = async (baseUrl?: string) => {
  let url: string | undefined;

  if (baseUrl) {
    url = baseUrl;
  } else {
    try {
      const config = await invoke<{ backend_url: string }>("load_config");
      url = config.backend_url;
    } catch (error) {
      void logger.error(`Failed to load config: ${safeStringify(error)}`);
      
      if (constants.PROD) {
        throw new Error(
          `Backend URL configuration is required in production. ` +
          `Please configure the backend URL in settings or set VITE_BACKEND_URL environment variable.`
        );
      }
      
      url = import.meta.env.VITE_BACKEND_URL;
    }
  }

  if (!url || url.trim() === "") {
    throw new Error("Backend URL cannot be empty. Please configure the backend URL.");
  }

  try {
    const { default: Medusa } = await import("@medusajs/js-sdk");
    
    sdkInstance = new Medusa({
      baseUrl: url,
      // The token lives only in the Tauri store (see storeAuthToken), never in localStorage.
      auth: { type: "jwt", jwtTokenStorageMethod: "nostore" },
    });
    
    try {
      const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
      sdkInstance.client.fetch = createSdkFetch({
        baseUrl: url,
        transport: tauriFetch,
        getAuthToken,
        storeAuthToken,
        onUnauthorized: () => unauthorizedHandler?.(),
        log: logRequest,
      }) as typeof sdkInstance.client.fetch;
    } catch (fetchError) {
      void logger.warn(`Failed to patch SDK fetch with Tauri HTTP, using browser fetch: ${safeStringify(fetchError)}`);
    }
    
    sdkBaseUrl = url;

    return sdkInstance;
  } catch (error) {
    void logger.error(`Error creating Medusa SDK instance: ${safeStringify(error)}`);
    throw new Error(`Failed to create Medusa SDK: ${error}`);
  }
};

export const getSdk = () => {
  if (!sdkInstance) {
    throw new Error("SDK not initialized. Call initializeSdk first.");
  }
  return sdkInstance;
};

export const getSdkBaseUrl = () => {
  if (!sdkBaseUrl) {
    throw new Error("SDK not initialized. Call initializeSdk first.");
  }
  return sdkBaseUrl;
};

/** Resets the SDK instance — used when the backend URL changes. */
export const resetSdk = () => {
  sdkInstance = null;
  sdkBaseUrl = null;
  sdkInitPromise = null;
  clearAuthTokenCache();
};
