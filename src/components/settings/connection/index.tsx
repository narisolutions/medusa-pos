import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useConnectionSettings } from "./hooks";
import { useForm } from "react-hook-form";
import { Forms } from "@/types/form";
import { zodResolver } from "@hookform/resolvers/zod";
import schemas from "@/utils/schemas";
import { useTranslation } from "@/i18n";

const ConnectionSettings: React.FC = () => {
  const { t } = useTranslation();
  const form = useForm<Forms["ApiSettings"]>({
    resolver: zodResolver(schemas.apiSettings),
    defaultValues: {
      backend_url: "",
      sales_channel: "",
      stock_location: "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isDirty },
  } = form;

  const {
    isLoading,
    isLoadingSalesChannels,
    isLoadingStockLocations,
    salesChannels,
    stockLocations,
    onSubmit,
    getSelectedChannelName,
    getSelectedLocationName,
    admin,
  } = useConnectionSettings({ form });

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="border-b border-theme-border pb-6 space-y-2">
        <p className="text-lg leading-relaxed text-fg-muted font-medium">
          {t("settings.connection.description")}
        </p>
        <p className="text-sm text-fg-subtle leading-relaxed">
          {t("settings.connection.long_description")}
        </p>
      </div>

      <p className="text-sm text-fg-muted">
        {t("settings.connection.logged_in_label")}
        <span className="font-medium">
          {(admin as unknown as { user: { email: string } })?.user?.email}
        </span>
      </p>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <FormField
            control={control}
            name="backend_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-medium">{t("settings.connection.api_url_label")}</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder={t("settings.connection.api_url_placeholder")}
                    className="h-12 text-lg px-4"
                    disabled={true}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-base text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="sales_channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-medium">
                  {t("settings.connection.sales_channel_label")}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger
                      className="h-12 text-lg px-4"
                      disabled={isLoadingSalesChannels}
                    >
                      {field.value ? (
                        <span>{getSelectedChannelName()}</span>
                      ) : (
                        <span className="text-fg-muted">
                          {isLoadingSalesChannels
                            ? t("settings.connection.loading_sales_channels")
                            : t("settings.connection.select_sales_channel")}
                        </span>
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salesChannels?.map((channel: { id: string; name: string }) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                    {(!salesChannels || salesChannels.length === 0) && (
                      <SelectItem value="" className="text-fg-muted">
                        {isLoadingSalesChannels
                          ? t("settings.connection.loading_sales_channels")
                          : t("settings.connection.no_sales_channels")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage className="text-base text-red-600" />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="stock_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-medium">
                  {t("settings.connection.stock_location_label")}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger
                      className="h-12 text-lg px-4"
                      disabled={isLoadingStockLocations}
                    >
                      {field.value ? (
                        <span>{getSelectedLocationName()}</span>
                      ) : (
                        <span className="text-fg-muted">
                          {isLoadingStockLocations
                            ? t("settings.connection.loading_stock_locations")
                            : t("settings.connection.select_stock_location")}
                        </span>
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stockLocations?.map((location: { id: string; name: string }) => (
                      <SelectItem key={location.id} value={String(location.id)}>
                        {location.name}
                      </SelectItem>
                    ))}
                    {(!stockLocations || stockLocations.length === 0) && (
                      <SelectItem value="" className="text-fg-muted">
                        {isLoadingStockLocations
                          ? t("settings.connection.loading_stock_locations")
                          : t("settings.connection.no_stock_locations")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage className="text-base text-red-600" />
              </FormItem>
            )}
          />
          

          <Button
            type="submit"
            disabled={isLoading || !isDirty}
            className="h-12 px-6 text-white text-lg min-w-[48px] bg-primary hover:bg-primary/90"
          >
            {isLoading ? t("settings.connection.saving") : t("settings.connection.save_button")}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ConnectionSettings;
