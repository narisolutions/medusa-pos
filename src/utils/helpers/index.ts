import { toast } from "sonner";
import { formatDateTime, formatPrice } from "@/utils/preferences";
import router from "@/router/router";
import constants from "@/utils/constants";
import { Store } from "@tauri-apps/plugin-store";
import { queryClient } from "@/config/query";
import { useCartStore } from "@/context/cart";
import { useUser } from "@/context/user";
import storage from "@/utils/storage";

const getRoutes = () => {
  return {
    signIn: "/sign-in",
    setup: "/setup",
    orders: "/orders",
    checkout: "/checkout",
    settings: "/settings",
  };
};

const getAuthenticatedPages = () => {
  const path = router.state.location.pathname;

  return {
    orders: new RegExp(`^orders$`).test(path),
    checkout: new RegExp(`^checkout$`).test(path),
    settings: new RegExp(`^settings$`).test(path),
  };
};


/**
 * Tauri `invoke` rejections are not always `Error` instances; normalize for UI and logging.
 */
const getTauriInvokeErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim().length > 0) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return record.error;
    }
  }
  console.error("Tauri invoke error (unparsed):", error);
  return fallback;
};

const handleErrorToast = (
  error: unknown,
  options?: { posEndpointError?: boolean }
) => {
  if (options?.posEndpointError) {
    const { status, body } = error as { status?: number; body?: unknown };

    if (status === 404 || status === 405) {
      toast.error(constants.POS_ENDPOINT_MISSING_MESSAGE);
      return;
    }

    if (status && status >= 500) {
      // Try to surface a more specific backend message if available
      const backendMessage =
        typeof body === "string"
          ? body
          : body && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message)
          : null;

      if (backendMessage && backendMessage.trim().length > 0) {
        toast.error(backendMessage);
        return;
      }

      toast.error(
        "POS endpoint returned a server error. Please check your Medusa POS backend configuration."
      );
      return;
    }
  }

  if (error instanceof Error) {
    toast.error(error.message);
  } else if (typeof error === "string") {
    toast.error(error);
  } else {
    toast.error("An unknown error occurred.");
  }
};

const formatDate = (date: Date | string): string => formatDateTime(date);

const formatExactTime = (date: Date | string): string => formatDateTime(date);

const formatTimeAgo = (date: Date | string): string => {
  if (!date || typeof date !== "string" || date.trim() === "") {
    return "Invalid Date";
  }

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < 0) {
    return "Invalid Date";
  }

  const now = new Date();
  const diffInMs = now.getTime() - parsedDate.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `about ${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffInHours < 24) {
    return `about ${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  } else if (diffInDays < 7) {
    return `about ${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  } else {
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `about ${diffInWeeks} week${diffInWeeks !== 1 ? "s" : ""} ago`;
  }
};

const generateRandomFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 15); // YYYYMMDDHHMMSS

  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");

  return `${timestamp}-${random}`;
};

const triggerFileDownload = async (
  res: Response
): Promise<{ filename: string; fullPath: string }> => {
  const fs = await import("@tauri-apps/plugin-fs");

  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const disposition = res.headers.get("Content-Disposition");
  let filename = generateRandomFilename();

  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, "");
    }
  }

  await fs.writeFile(filename, new Uint8Array(arrayBuffer), {
    baseDir: fs.BaseDirectory.Download,
  });

  // Return filename - fullPath will be resolved in openDownloadsFolder
  const fullPath = filename;

  return { filename, fullPath };
};

const openDownloadsFolder = async (
  downloadedFilename?: string
): Promise<void> => {
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    const fs = await import("@tauri-apps/plugin-fs");

    // Get a file in Downloads to use for revealing the folder
    let fileToUse = downloadedFilename;

    if (!fileToUse) {
      const files = await fs.readDir(".", {
        baseDir: fs.BaseDirectory.Download,
      });
      if (files.length > 0 && files[0].name) {
        fileToUse = files[0].name;
      }
    }

    if (!fileToUse) {
      throw new Error("No files found in Downloads folder");
    }

    // Try to get the full path of the file
    // For Tauri v2, we need to construct the full path to the Downloads folder
    // and then append the filename
    try {
      // Try using the file directly - revealItemInDir might handle base directories
      await revealItemInDir(fileToUse);
    } catch {
      // If that fails, try to construct the full path
      // Get the Downloads directory path using platform-specific methods
      const { homeDir } = await import("@tauri-apps/api/path");
      const home = await homeDir();

      // Construct the full path to the file
      const isWindows = navigator.platform.toLowerCase().includes("win");
      const separator = isWindows ? "\\" : "/";
      const downloadsDir = isWindows ? `${home}Downloads` : `${home}/Downloads`;
      const fullPath = `${downloadsDir}${separator}${fileToUse}`;

      await revealItemInDir(fullPath);
    }
  } catch (error) {
    console.error("Failed to open Downloads folder:", error);
    handleErrorToast("Failed to open Downloads folder");
  }
};

const isEmpty = (value: unknown): boolean => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" &&
      value !== null &&
      Object.keys(value).length === 0)
  );
};

// Token storage utilities for Tauri store sync
const TOKEN_STORE_KEY = "medusa_auth_token";
let tokenStore: Store | null = null;

const getTokenStore = async (): Promise<Store> => {
  if (!tokenStore) {
    const { Store } = await import("@tauri-apps/plugin-store");
    tokenStore = await Store.load(".auth.dat");
  }
  return tokenStore;
};

const syncAuthTokenToStore = async (): Promise<void> => {
  try {
    const token = localStorage.getItem(TOKEN_STORE_KEY);
    if (token) {
      const store = await getTokenStore();
      await store.set(TOKEN_STORE_KEY, token);
      await store.save();
    }
  } catch (error) {
    console.warn("Failed to sync auth token to Tauri store:", error);
  }
};

const getAuthToken = async (): Promise<string | null> => {
  try {
    const store = await getTokenStore();
    const token = await store.get<string>(TOKEN_STORE_KEY);

    if (token) {
      return token;
    }

    const localToken = localStorage.getItem(TOKEN_STORE_KEY);

    if (localToken) {
      await syncAuthTokenToStore();
    }

    return localToken;
  } catch (error) {
    console.warn(
      "Failed to get auth token from store, trying localStorage:",
      error
    );
    try {
      return localStorage.getItem(TOKEN_STORE_KEY);
    } catch {
      return null;
    }
  }
};

// Order Status Helpers
const formatOrderStatusText = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
};

const getOrderStatusColorFromMapping = (
  status: string,
  mapping: Record<string, string>
): string => {
  return mapping[status.toLowerCase()] || "bg-gray-400";
};

const getOrderStatusColor = (status: string): string => {
  return getOrderStatusColorFromMapping(status, constants.ORDER_STATUS_COLORS);
};

const getOrderFulfillmentStatusColor = (status: string): string => {
  return getOrderStatusColorFromMapping(
    status,
    constants.ORDER_FULFILLMENT_STATUS_COLORS
  );
};

const getOrderPaymentStatusColor = (status: string): string => {
  return getOrderStatusColorFromMapping(
    status,
    constants.ORDER_PAYMENT_STATUS_COLORS
  );
};

const isOrderGuestCustomer = (
  email?: string | null,
  guestEmail?: string | null
): boolean => {
  if (!email) return true;
  if (!guestEmail) return false;
  return guestEmail === email;
};

/**
 * Comprehensive reset function when backend URL changes
 * Clears all cached data, state, and storage to prevent cross-environment issues
 */
const resetOnBackendChange = async (): Promise<void> => {
  const { resetSdk } = await import("@/config/medusa");
  resetSdk();

  queryClient.clear();

  document.documentElement.style.removeProperty("--color-primary");
  document.documentElement.style.removeProperty("--color-secondary");
  document.documentElement.style.removeProperty("--font-scale");
  document.title = "POS";

  useCartStore.getState().clearItems();
  useCartStore.getState().setDraftOrderId(null);

  await storage.clearOnBackendChange();

  await storage.removeItem("cart").catch(() => {});

  useUser.getState().update(null);

  const { useSalesChannel } = await import("@/context/sales-channel");
  useSalesChannel.getState().setSalesChannelId(undefined);
  useSalesChannel.getState().setNeedsWarning(true);
};

const checkBackendHealth = async (
  baseUrl: string,
  options?: { timeoutMs?: number },
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { fetch } = await import("@tauri-apps/plugin-http");
    const url = baseUrl.replace(/\/$/, "");
    const signal = options?.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined;
    const response = await fetch(`${url}/health`, { method: "GET", signal });
    if (!response.ok) {
      return {
        success: false,
        error: `${response.status} ${response.statusText}`,
      };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

export {
  getRoutes,
  getAuthenticatedPages,
  getTauriInvokeErrorMessage,
  handleErrorToast,
  formatDate,
  formatExactTime,
  formatTimeAgo,
  formatPrice,
  triggerFileDownload,
  openDownloadsFolder,
  isEmpty,
  syncAuthTokenToStore,
  getAuthToken,
  formatOrderStatusText,
  getOrderStatusColorFromMapping,
  getOrderStatusColor,
  getOrderFulfillmentStatusColor,
  getOrderPaymentStatusColor,
  isOrderGuestCustomer,
  resetOnBackendChange,
  checkBackendHealth,
};
