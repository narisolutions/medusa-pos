import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "@/i18n";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import {
  triggerFileDownload,
  openDownloadsFolder,
  handleErrorToast,
  formatOrderStatusText,
  getOrderStatusColor,
  getOrderFulfillmentStatusColor,
  getOrderPaymentStatusColor,
  printerIssueStaffHintToast,
} from "@/utils/helpers";
import { getSdkBaseUrl, getSdk, getAuthToken } from "@/config/medusa";
import { useQueryClient } from "@tanstack/react-query";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { classifyFulfillment, classifyOrderShippingMethod } from "@/utils/pos/fulfillment";

// Type for fulfillment with extended properties
type ExtendedFulfillment = Record<string, unknown> & {
  id: string;
  provider?: { id?: string };
  labels?: Array<{
    tracking_number?: string;
    tracking_url?: string;
    label_url?: string;
  }>;
};

/** Email used for checkout / receipts — e.g. fulfill button visibility (includes walk-in guest). */
export function getOrderContactEmail(order: AdminOrder): string | undefined {
  const fromCustomer = order.customer?.email;
  if (fromCustomer && fromCustomer.trim() !== "") return fromCustomer;
  const fromOrder = order.email;
  if (fromOrder && fromOrder.trim() !== "") return fromOrder;
  return undefined;
}

export const useOrder = (order: AdminOrder) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { printOrderReceipt, downloadReceiptAsPDF, getDefaultPrinter } =
    usePrinterService();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [isMarkingAsPickedUp, setIsMarkingAsPickedUp] = useState(false);
  const [isFulfillmentDialogOpen, setIsFulfillmentDialogOpen] = useState(false);
  const [isPickupConfirmationOpen, setIsPickupConfirmationOpen] =
    useState(false);

  const fulfillmentStatus = order.fulfillment_status;
  const isNegativeFulfillmentStatus =
    fulfillmentStatus === "canceled" || fulfillmentStatus === "not_fulfilled";

  const fulfillment = order.fulfillments?.[0] as unknown as
    | ExtendedFulfillment
    | undefined;

  // Status color getters (using helpers from utils)
  const getStatusColor = getOrderStatusColor;
  const getFulfillmentStatusColor = getOrderFulfillmentStatusColor;
  const getPaymentStatusColor = getOrderPaymentStatusColor;

  // Helper to invalidate order queries
  const invalidateOrderQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["order", order.id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const handleBackToOrders = () => {
    navigate("/orders");
  };

  const handleReprintReceipt = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      await printOrderReceipt(order);
      toast.success(t("orders.receipt_sent_to_printer"));
    } catch {
      const printer = getDefaultPrinter();
      if (printer) {
        toast.error(t("orders.receipt_did_not_print"), {
          description: printerIssueStaffHintToast(printer.name),
        });
      } else {
        toast.error(t("orders.receipt_did_not_print"), {
          description: t("checkout.no_default_printer"),
        });
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadReceiptPDF = async () => {
    if (isDownloadingPDF) return;

    setIsDownloadingPDF(true);
    try {
      await downloadReceiptAsPDF(order);
    } catch {
      handleErrorToast(t("orders.failed_to_download_receipt"));
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadShippingLabel = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const orderId = order.id;
      const relativeUrl = `/admin/orders/${orderId}/shipping-label`;

      const baseUrl = getSdkBaseUrl();
      const fullUrl = `${baseUrl}${relativeUrl}`;

      // Get auth token from Tauri store (preferred) or localStorage (fallback)
      const authHeaders: Record<string, string> = {};

      try {
        const token = await getAuthToken();

        if (token) {
          authHeaders["Authorization"] = `Bearer ${token}`;
        } else {
          console.warn(
            "No auth token found in store or localStorage, relying on cookies"
          );
        }
      } catch (error) {
        // If we can't access token storage, continue without token and rely on cookies
        console.warn("Could not access auth token storage:", error);
      }

      // Use native fetch with auth headers and cookies
      // Native fetch in Tauri has access to the same cookie storage as the SDK
      const fetchHeaders: HeadersInit = {
        "Content-Type": "application/json",
        ...authHeaders,
      };

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: fetchHeaders,
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download shipping label: ${response.statusText}`
        );
      }

      const { filename } = await triggerFileDownload(response);
      toast.success(t("orders.shipping_label_downloaded", { filename }), {
        description: t("printer_service.saved_to_downloads"),
        action: {
          label: t("printer_service.open_folder_button"),
          onClick: () => openDownloadsFolder(filename),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      handleErrorToast(t("orders.failed_to_download_shipping_label", { error: errorMessage }));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreateShipment = async () => {
    if (isCreatingShipment || !fulfillment) return;

    const label = fulfillment.labels?.[0];
    if (!label) {
      handleErrorToast(t("orders.no_shipping_label"));
      return;
    }

    setIsCreatingShipment(true);
    try {
      const sdk = getSdk();
      await sdk.admin.fulfillment.createShipment(fulfillment.id, {
        labels: [
          {
            tracking_number: label.tracking_number || "",
            tracking_url: label.tracking_url || "",
            label_url: label.label_url || "",
          },
        ],
      });

      toast.success(t("orders.shipment_created_success"));
      invalidateOrderQueries();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      handleErrorToast(t("orders.failed_to_create_shipment", { error: errorMessage }));
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleOpenPickupConfirmation = () => {
    if (!fulfillment?.id) {
      handleErrorToast(t("orders.no_fulfillment_found"));
      return;
    }
    setIsPickupConfirmationOpen(true);
  };

  const handleMarkAsPickedUp = async () => {
    if (isMarkingAsPickedUp || !fulfillment?.id) {
      if (!fulfillment?.id) {
        handleErrorToast(t("orders.no_fulfillment_found"));
      }
      return;
    }

    setIsMarkingAsPickedUp(true);
    setIsPickupConfirmationOpen(false);
    try {
      const sdk = getSdk();
      await sdk.admin.order.markAsDelivered(order.id, fulfillment.id);

      toast.success(t("orders.marked_as_picked_up_success"));
      invalidateOrderQueries();
      navigate("/orders");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      handleErrorToast(t("orders.failed_to_mark_as_picked_up", { error: errorMessage }));
    } finally {
      setIsMarkingAsPickedUp(false);
    }
  };

  const firstFulfillment = order.fulfillments?.[0];
  const fulfillmentClass = firstFulfillment
    ? classifyFulfillment(firstFulfillment)
    : null;

  const orderShippingClass = classifyOrderShippingMethod(order);
  const isPickupOrder = orderShippingClass.isPickup || !!fulfillmentClass?.isPickup;

  const canCreateShipment =
    fulfillmentStatus === "fulfilled" &&
    !!fulfillmentClass?.isShipping &&
    !!fulfillment?.labels?.[0];

  const canMarkAsPickedUp =
    fulfillmentStatus === "fulfilled" &&
    !!fulfillmentClass?.isPickup;

  const canDownloadShippingLabel =
    !isPickupOrder &&
    fulfillmentStatus !== "fulfilled" &&
    fulfillmentStatus !== "delivered";

  return {
    getStatusColor,
    getFulfillmentStatusColor,
    getPaymentStatusColor,
    formatStatusText: formatOrderStatusText,
    handleBackToOrders,
    handleReprintReceipt,
    handleDownloadShippingLabel,
    handleCreateShipment,
    handleOpenPickupConfirmation,
    handleMarkAsPickedUp,
    isPrinting,
    isDownloading,
    isDownloadingPDF,
    isCreatingShipment,
    isMarkingAsPickedUp,
    canCreateShipment,
    canMarkAsPickedUp,
    canDownloadShippingLabel,
    isNegativeFulfillmentStatus,
    isFulfillmentDialogOpen,
    setIsFulfillmentDialogOpen,
    isPickupConfirmationOpen,
    setIsPickupConfirmationOpen,
    handleDownloadReceiptPDF,
  };
};
