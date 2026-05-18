import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { ImageIcon, Upload, X, Banknote, CreditCard, Plus, Trash2, Info, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Forms } from "@/types/form";
import { DEFAULT_PAYMENT_METHODS } from "@/utils/settings/store/metadata";
import { useQueryPaymentProviders } from "@/hooks/queries/useQueryPaymentProviders";
import { useStoreSettings } from "./hooks";
import ColorField from "./color-field";
import { useTranslation } from "@/i18n";

const StoreSettings: React.FC = () => {
  const { t } = useTranslation();
  const form = useForm<Forms["StoreSettings"]>({
    defaultValues: {
      storeName: "",
      brandName: "",
      logoUrl: undefined,
      primaryColor: "",
      secondaryColor: "",
      fontSize: "16",
      storeAddress: "",
      storeAddress2: "",
      storePhone: "",
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      guestCustomerEmail: "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isDirty, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "paymentMethods",
  });

  const { data: installedProviders, isError: providersError } = useQueryPaymentProviders();
  const installedProviderIds = new Set((!providersError && installedProviders?.map((p) => p.id)) || []);

  const {
    currentLogoUrl,
    isPickingLogo,
    isLoading,
    onSubmit,
    handlePickLogo,
    handleRemoveLogo,
  } = useStoreSettings({ form });

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="border-b border-theme-border pb-6">
        <p className="text-lg leading-relaxed text-fg-muted font-medium">
          {t("settings.store.description")}
        </p>
      </div>

      <div>
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 max-w-3xl pb-6"
          >
            <FormField
              control={control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("settings.store.store_name_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("settings.store.store_name_placeholder")}
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="brandName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("settings.store.brand_name_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("settings.store.brand_name_placeholder")}
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3">
              <Label className="text-lg font-medium">{t("settings.store.logo_label")}</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed border-theme-border-strong rounded-lg flex items-center justify-center bg-surface-subtle shrink-0 overflow-hidden">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt={t("settings.store.logo_preview_alt")}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-fg-subtle" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePickLogo}
                    disabled={isPickingLogo || isLoading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isPickingLogo ? t("settings.store.opening_logo") : t("settings.store.choose_logo_button")}
                  </Button>
                  {currentLogoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveLogo}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4 mr-2" /> {t("settings.store.remove_logo_button")}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-fg-muted">
                {t("settings.store.logo_requirements")}
              </p>
            </div>

            <FormField
              control={control}
              name="storeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("settings.store.store_address_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("settings.store.store_address_placeholder")}
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="storeAddress2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("settings.store.store_address2_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("settings.store.store_address2_placeholder")}
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="storePhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("settings.store.store_phone_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("settings.store.store_phone_placeholder")}
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="guestCustomerEmail"
              render={({ field }) => (
                <FormItem id="guest-customer-email">
                  <FormLabel className="text-lg font-medium flex items-center gap-2">
                    {t("settings.store.guest_email_label")}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-surface-subtle"
                        >
                          <Info className="w-4 h-4 text-fg-subtle" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={4}
                        className="max-w-xs text-left"
                      >
                        {t("settings.store.guest_email_tooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("settings.store.guest_email_placeholder")}
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Label className="text-lg font-medium">{t("settings.store.payment_methods_label")}</Label>
              <p className="text-sm text-fg-muted">
                {t("settings.store.payment_methods_description")}
              </p>
              <div className="space-y-3 rounded-lg border border-theme-border p-4 bg-surface-muted">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-theme-border"
                  >
                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.enabled`}
                      render={({ field: checkboxField }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 shrink-0">
                          <FormControl>
                            <Checkbox
                              checked={checkboxField.value}
                              onCheckedChange={(v) =>
                                checkboxField.onChange(v === true)
                              }
                              disabled={isLoading}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.id`}
                      render={({ field: idField }) => {
                        const idValue = idField.value ?? "";
                        const isUnknown =
                          installedProviders !== undefined &&
                          installedProviderIds.size > 0 &&
                          idValue.length > 0 &&
                          !installedProviderIds.has(idValue);
                        return (
                          <FormItem className="w-48 shrink-0">
                            <div className="relative">
                              <FormControl>
                                <Input
                                  placeholder={t("settings.store.provider_id_placeholder")}
                                  className={`h-10 font-mono text-sm${isUnknown ? " pr-8 border-yellow-500" : ""}`}
                                  disabled={isLoading}
                                  {...idField}
                                />
                              </FormControl>
                              {isUnknown && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-500 cursor-help">
                                      <AlertTriangle className="w-4 h-4" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t("settings.store.provider_id_not_installed")}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.label`}
                      render={({ field: inputField }) => (
                        <FormItem className="flex-1 min-w-0">
                          <FormControl>
                            <Input
                              placeholder={t("settings.store.display_name_placeholder")}
                              className="h-10"
                              disabled={isLoading}
                              {...inputField}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.icon`}
                      render={({ field: iconField }) => (
                        <FormItem className="w-28 shrink-0">
                          <Select
                            value={iconField.value ?? "card"}
                            onValueChange={iconField.onChange}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="h-10"
                                disabled={isLoading}
                              >
                                <SelectValue placeholder={t("settings.store.icon_label")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">
                                <span className="flex items-center gap-2">
                                  <Banknote className="w-4 h-4" /> {t("settings.store.icon_cash")}
                                </span>
                              </SelectItem>
                              <SelectItem value="card">
                                <span className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" /> {t("settings.store.icon_card")}
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.type`}
                      render={({ field: typeField }) => (
                        <FormItem className="w-28 shrink-0">
                          <Select
                            value={typeField.value ?? "card"}
                            onValueChange={typeField.onChange}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="h-10"
                                disabled={isLoading}
                              >
                                <SelectValue placeholder={t("settings.store.type_label")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">
                                {t("settings.store.type_cash")}
                              </SelectItem>
                              <SelectItem value="card">
                                {t("settings.store.type_card")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-fg-muted hover:text-destructive hover:bg-destructive/10"
                      onClick={() => remove(index)}
                      disabled={isLoading || fields.length <= 1}
                      aria-label={t("settings.store.remove_payment_method_aria")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                    append({
                      id: "",
                      label: "",
                      enabled: true,
                      icon: "card",
                      type: "card",
                    })
                  }
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("settings.store.add_payment_method_button")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="fontSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium">
                      {t("settings.store.font_size_label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={10}
                        max={32}
                        className="h-12 text-lg px-4"
                        disabled={true}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="primaryColor"
                render={({ field }) => (
                  <ColorField
                    label={t("settings.store.primary_color_label")}
                    value={field.value}
                    placeholder={t("settings.store.primary_color_placeholder")}
                    disabled={isLoading}
                    onChange={field.onChange}
                  />
                )}
              />

              <FormField
                control={control}
                name="secondaryColor"
                render={({ field }) => (
                  <ColorField
                    label={t("settings.store.secondary_color_label")}
                    value={field.value}
                    placeholder={t("settings.store.secondary_color_placeholder")}
                    disabled={isLoading}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={!isDirty || isSubmitting || isLoading}
              className="h-12 px-6 text-white text-lg min-w-[48px] bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? t("settings.store.saving") : t("settings.store.save_button")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StoreSettings;
