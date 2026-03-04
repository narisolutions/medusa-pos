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
import { useApiSettings } from "./hooks";
import { useForm } from "react-hook-form";
import { Forms } from "@/types/form";
import { zodResolver } from "@hookform/resolvers/zod";
import schemas from "@/utils/schemas";

const ApiSettings: React.FC = () => {
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
  } = useApiSettings({ form });

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <p className="text-lg leading-relaxed text-gray-600 font-medium">
          Configure your backend API connection and sales channel
        </p>
      </div>

      <p className="text-sm text-gray-600">
        Currently logged in:{" "}
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
                <FormLabel className="text-lg font-medium">API URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://your-backend.com"
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
                  Sales Channel
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
                        <span className="text-gray-500">
                          {isLoadingSalesChannels
                            ? "Loading sales channels..."
                            : "Select a sales channel"}
                        </span>
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salesChannels?.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                    {(!salesChannels || salesChannels.length === 0) && (
                      <SelectItem value="" className="text-gray-500">
                        {isLoadingSalesChannels
                          ? "Loading sales channels..."
                          : "No sales channels available"}
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
                  Stock Location
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
                        <span className="text-gray-500">
                          {isLoadingStockLocations
                            ? "Loading stock locations..."
                            : "Select a stock location"}
                        </span>
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stockLocations?.map((location) => (
                      <SelectItem key={location.id} value={String(location.id)}>
                        {location.name}
                      </SelectItem>
                    ))}
                    {(!stockLocations || stockLocations.length === 0) && (
                      <SelectItem value="" className="text-gray-500">
                        {isLoadingStockLocations
                          ? "Loading stock locations..."
                          : "No stock locations available"}
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
            {isLoading ? "Saving..." : "Save Configuration"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ApiSettings;
