import { logger, safeStringify } from "@/utils/logger";
import { toast } from "sonner";
import { formatDateTime, formatPrice } from "@/utils/settings/preferences";
import constants from "@/utils/constants";
import { t } from "@/i18n";

const getRoutes = () => {
  return {
    signIn: "/sign-in",
    setup: "/setup",
    orders: "/orders",
    checkout: "/checkout",
    settings: "/settings",
  };
};

/** Tauri `invoke` rejections are not always `Error` instances; normalize for UI and logging. */
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
  void logger.error(`Tauri invoke error (unparsed): ${safeStringify(error)}`);
  return fallback;
};

// The patched SDK fetch puts the status line in error.message and the parsed body
// on error.body — Medusa's useful explanation lives in body.message, prefer it.
const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "body" in error) {
    const { body } = error as { body?: unknown };
    if (typeof body === "string" && body.trim().length > 0) {
      return body;
    }
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
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
    toast.error(t("errors.something_went_wrong_toast"));
  }
};

const formatDate = (date: Date | string): string => formatDateTime(date);


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

/** Order currency with the store default as fallback. */
const getOrderCurrency = (order: { currency_code?: string | null }): string =>
  order.currency_code || constants.CHECKOUT_CONFIG.CURRENCY;

const isOrderGuestCustomer = (
  email?: string | null,
  guestEmail?: string | null
): boolean => {
  if (!email) return true;
  if (!guestEmail) return false;
  return guestEmail === email;
};

type OrderDeliveryCustomer = { name?: string; phone?: string; note?: string };

/**
 * An order booked from a delivery platform carries the person to hand the bag to on
 * its own metadata — it has no Medusa customer, so `customer.email` is the store's
 * guest address. Shared so the list and the detail card read the same place.
 */
const getOrderDeliveryCustomer = (order: {
  metadata?: Record<string, unknown> | null;
}): OrderDeliveryCustomer | undefined =>
  (order.metadata as { delivery?: { customer?: OrderDeliveryCustomer } } | null)
    ?.delivery?.customer;

/** One-line "who is this order for", for list columns. */
const getOrderCustomerLabel = (order: {
  email?: string | null;
  customer?: { email?: string | null; first_name?: string | null; last_name?: string | null } | null;
  billing_address?: { first_name?: string | null; last_name?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}): string => {
  const deliveryName = getOrderDeliveryCustomer(order)?.name?.trim();
  if (deliveryName) return deliveryName;

  const named = [
    [order.customer?.first_name, order.customer?.last_name],
    [order.billing_address?.first_name, order.billing_address?.last_name],
  ].find(([first, last]) => first || last);
  if (named) return named.filter(Boolean).join(" ");

  return order.customer?.email || order.email || "—";
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

/** Plain-language hints for staff; technical errors belong in console logs only. */
const printerIssueStaffHintToast = (printerName: string): string => {
  return [
    t("printer_service.hint_check_connected", { printer: printerName }),
    t("printer_service.hint_restart"),
    t("printer_service.hint_review_default"),
  ].join(" ");
}

/** Same connection guidance as print errors, plus Test drawer in Settings → Printers. */
const cashDrawerIssueStaffHintToast = (printerName: string): string => {
  return [
    t("printer_service.hint_drawer_test", { printer: printerName }),
    t("printer_service.hint_drawer_check_cable"),
    t("printer_service.hint_drawer_restart"),
  ].join(" ");
}

/** Used on the Printers settings screen — users are already in Settings. */
const printerIssueStaffHintSettings = (printerName: string): string => {
  return [
    t("printer_service.hint_check_connected", { printer: printerName }),
    t("printer_service.hint_restart"),
    t("printer_service.hint_verify_connection"),
  ].join(" ");
}


export {
  getRoutes,
  getTauriInvokeErrorMessage,
  getApiErrorMessage,
  handleErrorToast,
  formatDate,
  formatTimeAgo,
  formatPrice,
  isEmpty,
  formatOrderStatusText,
  getOrderStatusColorFromMapping,
  getOrderStatusColor,
  getOrderFulfillmentStatusColor,
  getOrderPaymentStatusColor,
  getOrderCurrency,
  isOrderGuestCustomer,
  getOrderDeliveryCustomer,
  getOrderCustomerLabel,
  checkBackendHealth,
  printerIssueStaffHintToast,
  cashDrawerIssueStaffHintToast,
  printerIssueStaffHintSettings,
};
