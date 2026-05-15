import { invoke } from "@tauri-apps/api/core";
import constants from "@/utils/constants";
import type Medusa from "@medusajs/js-sdk";

const AUTH_TOKEN_KEY = "medusa_auth_token";

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load(".auth.dat");
    const token = await store.get<string>(AUTH_TOKEN_KEY);
    if (token) return token;
    const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (localToken) {
      await store.set(AUTH_TOKEN_KEY, localToken);
      await store.save();
    }
    return localToken;
  } catch {
    try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
  }
};

let sdkInstance: InstanceType<typeof Medusa> | null = null;
let sdkBaseUrl: string | null = null;
let sdkInitializing = false;

export const initializeSdk = async (baseUrl?: string) => {
  if (sdkInstance) {
    return sdkInstance;
  }
  
  if (sdkInitializing) {
    while (sdkInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return sdkInstance;
  }
  
  sdkInitializing = true;
  
  let url: string | undefined;

  if (baseUrl) {
    url = baseUrl;
  } else {
    try {
      const config = await invoke<{ backend_url: string }>("load_config");
      url = config.backend_url;
    } catch (error) {
      console.error("Failed to load config:", error);
      
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
      auth: { type: "jwt" },
    });
    
    try {
      const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
      const normalizedBaseUrl = url.replace(/\/$/, "");
      
      sdkInstance.client.fetch = ((path: string | URL, init?: unknown) => {
        // Handle both string and URL objects
        let pathString: string;
        if (path instanceof URL) {
          pathString = path.pathname + path.search;
        } else {
          pathString = path;
        }
        
        // Extract query parameters from init object (Medusa SDK passes them here)
        const initObj = init as Record<string, unknown> | undefined;
        let queryParams = "";
        if (initObj?.query) {
          const query = initObj.query as Record<string, unknown>;
          const params = new URLSearchParams();
          Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
          queryParams = params.toString();
        }
        
        // Build full URL with query parameters
        let fullUrl = pathString.startsWith("http") 
          ? pathString 
          : `${normalizedBaseUrl}${pathString.startsWith("/") ? "" : "/"}${pathString}`;
        
        // Append query parameters if they exist
        if (queryParams) {
          fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryParams;
        }
        
        return (async () => {
          // Remove query from init since we've added it to the URL
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { query, ...restInit } = (initObj || {}) as { query?: unknown; [key: string]: unknown };
          let tauriInit = restInit as RequestInit | undefined;
          const headers = new Headers(tauriInit?.headers);
          
          // Stringify object bodies to JSON
          let body = tauriInit?.body;
          if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) {
            body = JSON.stringify(body);
            if (!headers.has("Content-Type")) {
              headers.set("Content-Type", "application/json");
            }
          } else if (body && typeof body === "string" && (tauriInit?.method === "POST" || tauriInit?.method === "PUT" || tauriInit?.method === "PATCH")) {
            if (!headers.has("Content-Type")) {
              headers.set("Content-Type", "application/json");
            }
          }
          
          // Add auth token for non-auth endpoints
          const isAuthEndpoint = pathString.includes("/auth/") && (pathString.includes("/login") || pathString.includes("/emailpass"));
          if (!isAuthEndpoint && !headers.has("Authorization")) {
            const token = await getAuthToken()
            if (token) {
              headers.set("Authorization", `Bearer ${token}`);
            }
          }
          
          const callerSignal = tauriInit?.signal as AbortSignal | undefined;
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => timeoutController.abort(), 15_000);
          const signal = callerSignal
            ? AbortSignal.any([callerSignal, timeoutController.signal])
            : timeoutController.signal;

          tauriInit = {
            ...tauriInit,
            headers,
            body: body !== undefined ? body : tauriInit?.body,
            signal,
          };
          
          return tauriFetch(fullUrl, tauriInit)
            .catch((fetchError: unknown) => {
              // Re-throw with more context
              if (fetchError instanceof Error) {
                const enhancedError = new Error(
                  `Tauri fetch failed: ${fetchError.message} (URL: ${fullUrl})`
                ) as Error & { originalError: unknown; url: string };
                enhancedError.stack = fetchError.stack;
                enhancedError.originalError = fetchError;
                enhancedError.url = fullUrl;
                throw enhancedError;
              }
              throw fetchError;
            })
            .then(async (response) => {
              clearTimeout(timeoutId);
              if (!response.ok) {
                let errorBody: string | undefined;
                try {
                  errorBody = await response.clone().text();
                } catch {
                  // Silently handle read error
                }
                
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & {
                  status: number;
                  statusText: string;
                  body?: unknown;
                };
                error.status = response.status;
                error.statusText = response.statusText;
                if (errorBody) {
                  try {
                    error.body = JSON.parse(errorBody);
                  } catch {
                    error.body = errorBody;
                  }
                }
                throw error;
              }
              
              const text = await response.text();
              // Empty body (204 No Content or empty 200) — return null instead of throwing SyntaxError
              if (!text || text.trim() === '') {
                return null;
              }
              const json = JSON.parse(text);
              
              // Extract and store auth token from login response
              if (pathString.includes("/auth/") && (pathString.includes("/login") || pathString.includes("/emailpass"))) {
                const jsonObj = json as Record<string, unknown>;
                const token = 
                  (typeof jsonObj?.token === "string" ? jsonObj.token : null) ||
                  (typeof jsonObj?.access_token === "string" ? jsonObj.access_token : null) ||
                  (jsonObj?.data && typeof (jsonObj.data as Record<string, unknown>)?.token === "string" 
                    ? (jsonObj.data as Record<string, unknown>).token as string 
                    : null) ||
                  response.headers.get("x-medusa-access-token") ||
                  response.headers.get("authorization")?.replace("Bearer ", "");
                
                  if (token && typeof token === "string") {
                    try {
                      // Store in Tauri store first (primary storage)
                      const { Store } = await import("@tauri-apps/plugin-store");
                      const store = await Store.load(".auth.dat");
                      await store.set("medusa_auth_token", token);
                      await store.save();
                      
                      // Then store in localStorage as fallback
                      localStorage.setItem("medusa_auth_token", token);
                    } catch (error) {
                      console.error("Failed to store auth token:", error);
                      // If Tauri store fails, still try localStorage
                      try {
                        localStorage.setItem("medusa_auth_token", token);
                      } catch (localError) {
                        console.error("Failed to store auth token in localStorage:", localError);
                      }
                    }
                  }
              }
              
              return json;
            })
            .catch((error) => {
              clearTimeout(timeoutId);
              throw error;
            });
        })();
      }) as typeof sdkInstance.client.fetch;
    } catch (fetchError) {
      console.warn("Failed to patch SDK fetch with Tauri HTTP, using browser fetch:", fetchError);
    }
    
    sdkBaseUrl = url;
    sdkInitializing = false;
    
    return sdkInstance;
  } catch (error) {
    sdkInitializing = false;
    console.error("Error creating Medusa SDK instance:", error);
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

/**
 * Resets the SDK instance - used when backend URL changes
 */
export const resetSdk = () => {
  sdkInstance = null;
  sdkBaseUrl = null;
  sdkInitializing = false;
};
