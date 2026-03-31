import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import {
  triggerFileDownload,
  openDownloadsFolder,
  getAuthToken,
  handleErrorToast,
  formatOrderStatusText,
  getOrderStatusColor,
  getOrderFulfillmentStatusColor,
  getOrderPaymentStatusColor,
} from "@/utils/helpers";
import { getSdkBaseUrl, getSdk } from "@/config/medusa";
import { useQueryClient } from "@tanstack/react-query";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { classifyFulfillment } from "@/utils/fulfillment";

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
  const { printOrderReceipt, downloadReceiptAsPDF } = usePrinterService();
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
      toast.success("Receipt printed successfully");
    } catch {
      handleErrorToast("Failed to print receipt. Please try again.");
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
      handleErrorToast("Failed to download receipt. Please try again.");
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
      toast.success(`Shipping label downloaded successfully: ${filename}`, {
        description: "Saved to your Downloads folder",
        action: {
          label: "Open Folder",
          onClick: () => openDownloadsFolder(filename),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      handleErrorToast(`Failed to download shipping label: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreateShipment = async () => {
    if (isCreatingShipment || !fulfillment) return;

    const label = fulfillment.labels?.[0];
    if (!label) {
      handleErrorToast("No shipping label found for this fulfillment");
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

      toast.success("Shipment created successfully");
      invalidateOrderQueries();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      handleErrorToast(`Failed to create shipment: ${errorMessage}`);
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleOpenPickupConfirmation = () => {
    if (!fulfillment?.id) {
      handleErrorToast("No fulfillment found for this order");
      return;
    }
    setIsPickupConfirmationOpen(true);
  };

  const handleMarkAsPickedUp = async () => {
    if (isMarkingAsPickedUp || !fulfillment?.id) {
      if (!fulfillment?.id) {
        handleErrorToast("No fulfillment found for this order");
      }
      return;
    }

    setIsMarkingAsPickedUp(true);
    setIsPickupConfirmationOpen(false);
    try {
      const sdk = getSdk();
      await sdk.admin.order.markAsDelivered(order.id, fulfillment.id);

      toast.success("Order marked as picked up successfully");
      invalidateOrderQueries();
      navigate("/orders");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      handleErrorToast(`Failed to mark as picked up: ${errorMessage}`);
    } finally {
      setIsMarkingAsPickedUp(false);
    }
  };

  const firstFulfillment = order.fulfillments?.[0];
  const fulfillmentClass = firstFulfillment
    ? classifyFulfillment(firstFulfillment)
    : null;

  const canCreateShipment =
    fulfillmentStatus === "fulfilled" &&
    !!fulfillmentClass?.isShipping &&
    !!fulfillment?.labels?.[0];

  const canMarkAsPickedUp =
    fulfillmentStatus === "fulfilled" &&
    !!fulfillmentClass?.isPickup;

  const canDownloadShippingLabel = !(
    fulfillmentStatus === "fulfilled" ||
    (fulfillmentStatus === "delivered" && !!fulfillmentClass?.isPickup)
  );

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
