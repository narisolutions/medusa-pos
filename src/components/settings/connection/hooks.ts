import { useState, useCallback, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useQuerySalesChannel } from "@/hooks/queries/useQuerySalesChannel";
import { useQueryStockLocation } from "@/hooks/queries/useQueryStockLocation";
import { Forms } from "@/types/form";
import { Preferences } from "@/types/utils";
import storage from "@/utils/storage";
import { useUser } from "@/context/user";
import { useSalesChannel } from "@/context/sales-channel";
import {
  handleErrorToast,
  checkBackendHealth,
} from "@/utils/helpers";
import { useStoreManager } from "@/context/store-manager";

interface Props {
  form: ReturnType<typeof useForm<Forms["ApiSettings"]>>;
}

export const useConnectionSettings = ({ form }: Props) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<Preferences>({});
  const admin = useUser((state) => state.admin);
  const setSalesChannelId = useSalesChannel((s) => s.setSalesChannelId);
  const setNeedsWarning = useSalesChannel((s) => s.setNeedsWarning);

  const { reset, watch } = form;
  const { data: salesChannelsRaw, isLoading: isLoadingSalesChannels } =
    useQuerySalesChannel();
  const { data: stockLocationsRaw, isLoading: isLoadingStockLocations } =
    useQueryStockLocation();
  const queryClient = useQueryClient();

  const salesChannels = useMemo(() => {
    if (!salesChannelsRaw) return [];
    return salesChannelsRaw.filter((channel) => !channel.is_disabled);
  }, [salesChannelsRaw]);

  const stockLocations = useMemo(() => {
    if (!stockLocationsRaw) return [];
    return stockLocationsRaw;
  }, [stockLocationsRaw]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await invoke<{
          backend_url?: string;
        }>("load_config");

        const storedSalesChannelId = await storage.getItem("sales_channel_id");
        const storedStockLocationId = await storage.getItem("stock_location_id");

        // Wait for sales channels to be loaded before setting the value
        let salesChannelValue = "";
        if (storedSalesChannelId && salesChannels.length > 0 && !isLoadingSalesChannels) {
          // Validate that stored channel exists in loaded channels
          const channelExists = salesChannels.some((ch) => ch.id === storedSalesChannelId);
          if (channelExists) {
            salesChannelValue = storedSalesChannelId;
          }
        } else if (storedSalesChannelId && salesChannels.length === 0 && !isLoadingSalesChannels) {
          // Sales channels loaded but empty - clear stored value
          await storage.setItem("sales_channel_id", "");
        }

        // Wait for stock locations to be loaded before setting the value
        let stockLocationValue = "";
        if (storedStockLocationId && stockLocations.length > 0 && !isLoadingStockLocations) {
          // Validate that stored location exists in loaded locations
          const locationExists = stockLocations.some((loc) => String(loc.id) === storedStockLocationId);
          if (locationExists) {
            stockLocationValue = storedStockLocationId;
          }
        } else if (storedStockLocationId && stockLocations.length === 0 && !isLoadingStockLocations) {
          // Stock locations loaded but empty - clear stored value
          await storage.setItem("stock_location_id", "");
        }

        const configValues = {
          backend_url: config?.backend_url || "",
          sales_channel: salesChannelValue,
          stock_location: stockLocationValue,
        };

        setInitialValues(configValues);
        reset(configValues);
      } catch {
        handleErrorToast(t("settings.connection.load_error"));

        const defaultValues = {
          backend_url: "",
          sales_channel: "",
          stock_location: "",
        };

        setInitialValues(defaultValues);
        reset(defaultValues);
      }
    };

    loadConfig();
  }, [salesChannels, isLoadingSalesChannels, stockLocations, isLoadingStockLocations, reset]);

  const onSubmit = useCallback(
    async (data: Forms["ApiSettings"]) => {
      setIsLoading(true);

      try {
        const changes = {
          hasBackendChanges: data.backend_url !== initialValues.backend_url,
          hasSalesChannelChanges:
            data.sales_channel !== initialValues.sales_channel,
          hasStockLocationChanges:
            data.stock_location !== initialValues.stock_location,
        };

        // Update Tauri config if backend URL changed
        if (changes.hasBackendChanges && data.backend_url) {
          const url = data.backend_url.replace(/\/$/, "").trim();
          const healthResult = await checkBackendHealth(url);
          if (!healthResult.success) {
            handleErrorToast(
              t("settings.connection.cannot_reach_backend", { error: healthResult.error })
            );
            return;
          }

          const activeStoreId = useStoreManager.getState().activeStoreId;
          if (!activeStoreId) {
            throw new Error("No active store to update");
          }

          await invoke("save_store_url", { storeId: activeStoreId, backendUrl: url });
          await invoke("set_active_backend", { storeId: activeStoreId });
        }

        // Update sales channel if changed
        if (changes.hasSalesChannelChanges && data.sales_channel) {
          await storage.setItem("sales_channel_id", data.sales_channel);
          setSalesChannelId(data.sales_channel);
          setNeedsWarning(false);
          queryClient.invalidateQueries({ queryKey: ["sales-channels"] });
        }

        // Update stock location if changed
        if (changes.hasStockLocationChanges && data.stock_location) {
          await storage.setItem("stock_location_id", data.stock_location);
          queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
        }

        // Reinitialize SDK if backend URL changed
        if (changes.hasBackendChanges && data.backend_url) {
          const { initializeSdk } = await import("@/config/medusa");
          await initializeSdk(data.backend_url);
        }

        // Update initial values after successful save
        setInitialValues({
          backend_url: data.backend_url || "",
          sales_channel: data.sales_channel || "",
          stock_location: data.stock_location || "",
        });

        toast.success(t("settings.connection.saved"));
      } catch (error) {
        let errorMessage = t("common.error");
        if (error instanceof Error) {
          errorMessage = error.message || t("common.error");
        } else if (typeof error === "string") {
          errorMessage = error;
        } else if (error && typeof error === "object" && "message" in error) {
          errorMessage =
            String((error as { message: unknown }).message) ||
            t("common.error");
        }

        handleErrorToast(t("settings.connection.save_failed", { error: errorMessage }));
      } finally {
        setIsLoading(false);
      }
    },
    [initialValues, queryClient, setSalesChannelId, setNeedsWarning, t]
  );

  // Get current selected sales channel name for display
  const getSelectedChannelName = useCallback(() => {
    const currentValue = watch("sales_channel");
    return salesChannels.find((ch) => ch.id === currentValue)?.name || "";
  }, [watch, salesChannels]);

  // Get current selected stock location name for display
  const getSelectedLocationName = useCallback(() => {
    const currentValue = watch("stock_location");
    return stockLocations.find((loc) => String(loc.id) === currentValue)?.name || "";
  }, [watch, stockLocations]);

  return {
    isLoading,
    isLoadingSalesChannels,
    isLoadingStockLocations,
    salesChannels,
    stockLocations,
    onSubmit,
    getSelectedChannelName,
    getSelectedLocationName,
    admin
  };
};
