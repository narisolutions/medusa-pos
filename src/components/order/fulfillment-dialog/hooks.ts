import { useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "@/i18n";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { getSdk } from "@/config/medusa";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryStockLocation } from "@/hooks/queries/useQueryStockLocation";
import { useQueryShippingOption } from "@/hooks/queries/useQueryShippingOption";
import storage from "@/utils/storage";
import { handleErrorToast } from "@/utils/helpers";

interface FulfillmentItem {
  id: string;
  quantity: number;
  maxQuantity: number;
}

function resolveFulfillmentShippingOptionId(
  order: AdminOrder,
  selectedId: string
): string | undefined {
  if (selectedId.trim() !== "") return selectedId;
  const fromOrder = order.shipping_methods?.find(
    (m) =>
      m.shipping_option_id != null &&
      String(m.shipping_option_id).trim() !== ""
  )?.shipping_option_id;
  return fromOrder ?? undefined;
}

export const useFulfillmentDialog = (
  order: AdminOrder,
  onClose?: () => void
) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedShippingOptionId, setSelectedShippingOptionId] =
    useState<string>("");
  const stockLocationsQuery = useQueryStockLocation();
  const shippingOptionsQuery = useQueryShippingOption();
  const preferredLocationIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  const [selectedItems, setSelectedItems] = useState<FulfillmentItem[]>(() => {
    return (
      order.items?.map((item) => ({
        id: item.id,
        quantity: 0, // Start at 0 - cashier adds items as they pack
        maxQuantity: item.quantity || 0,
      })) || []
    );
  });

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, Math.min(quantity, item.maxQuantity));
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }, []);

  const hasSelectedItems = useMemo(() => {
    return selectedItems.some((item) => item.quantity > 0);
  }, [selectedItems]);

  const handleCreateFulfillment = useCallback(async () => {
    if (!hasSelectedItems) {
      handleErrorToast(t("orders.select_at_least_one_item"));
      return;
    }

    // Filter items that have quantity > 0
    const itemsToFulfill = selectedItems
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        id: item.id,
        quantity: item.quantity,
      }));

    if (itemsToFulfill.length === 0) {
      handleErrorToast(t("orders.select_at_least_one_item"));
      return;
    }

    const shippingOptionId = resolveFulfillmentShippingOptionId(
      order,
      selectedShippingOptionId
    );

    if (!shippingOptionId) {
      toast.error(t("orders.no_shipping_on_order"), {
        description: t("orders.add_shipping_method_hint"),
      });
      return;
    }

    setIsProcessing(true);

    try {
      const sdk = getSdk();

      // Create fulfillment
      const fulfillmentPayload: {
        items: Array<{ id: string; quantity: number }>;
        no_notification: boolean;
        location_id?: string;
        shipping_option_id?: string;
      } = {
        items: itemsToFulfill,
        no_notification: false,
        shipping_option_id: shippingOptionId,
      };

      if (selectedLocationId) {
        fulfillmentPayload.location_id = selectedLocationId;
      }

      const response = await sdk.admin.order.createFulfillment(
        order.id,
        fulfillmentPayload
      );

      let fulfillmentId = response.order?.fulfillments?.[0]?.id;

      if (!fulfillmentId) {
        // Refresh order to get fulfillment ID
        const { order: refreshedOrder } = await sdk.admin.order.retrieve(
          order.id,
          { fields: "*fulfillments" }
        );
        fulfillmentId = refreshedOrder.fulfillments?.[0]?.id;
      }

      if (!fulfillmentId) {
        throw new Error("Failed to get fulfillment ID");
      }

      toast.success(t("orders.fulfillment_created_success"));

      // Invalidate order query to refetch updated order data
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      onClose?.();
    } catch (error) {
      console.error("Fulfillment error:", error);
      handleErrorToast(
        t("orders.failed_to_create_fulfillment", {
          error: error instanceof Error ? error.message : t("common.error"),
        })
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    order,
    selectedItems,
    hasSelectedItems,
    selectedLocationId,
    selectedShippingOptionId,
    onClose,
    queryClient,
    t,
  ]);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onClose?.();
    }
  }, [isProcessing, onClose]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      if (!open && !isProcessing) {
        handleClose();
      }
    },
    [isProcessing, handleClose]
  );

  const totalItemsToFulfill = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItems]);

  // Compute preferred location name directly from data and storage
  const preferredLocationName = useMemo(() => {
    if (!stockLocationsQuery.data || stockLocationsQuery.isLoading) {
      return null;
    }

    // Try to get preferred location ID from storage synchronously via ref
    // If not loaded yet, trigger async load
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      storage.getItem("stock_location_id").then((storedLocationId) => {
        if (storedLocationId && stockLocationsQuery.data) {
          const existsInList = stockLocationsQuery.data.some(
            (loc: { id: unknown }) => String(loc.id) === storedLocationId
          );
          if (existsInList && !selectedLocationId) {
            preferredLocationIdRef.current = storedLocationId;
            setSelectedLocationId(storedLocationId);
          } else {
            preferredLocationIdRef.current = storedLocationId;
          }
        }
      }).catch(() => {
        // Silent failure
      });
    }

    // Use ref value if available, otherwise use selectedLocationId
    const locationId = preferredLocationIdRef.current || selectedLocationId;
    if (!locationId) {
      return null;
    }

    const location = stockLocationsQuery.data.find(
      (loc: { id: unknown }) => String(loc.id) === locationId
    );

    return location?.name || null;
  }, [stockLocationsQuery.data, stockLocationsQuery.isLoading, selectedLocationId]);

  const selectedLocation = useMemo(() => {
    return stockLocationsQuery.data?.find(
      (location: { id: unknown }) => String(location.id) === selectedLocationId
    );
  }, [stockLocationsQuery.data, selectedLocationId]);

  const selectedShippingOption = useMemo(() => {
    return shippingOptionsQuery.data?.find(
      (option: { id: string }) => option.id === selectedShippingOptionId
    );
  }, [shippingOptionsQuery.data, selectedShippingOptionId]);

  return {
    isProcessing,
    selectedItems,
    updateItemQuantity,
    hasSelectedItems,
    handleCreateFulfillment,
    handleClose,
    handleDialogChange,
    selectedLocationId,
    setSelectedLocationId,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
    stockLocationsQuery,
    shippingOptionsQuery,
    totalItemsToFulfill,
    selectedLocation,
    selectedShippingOption,
    preferredLocationName,
  };
};

