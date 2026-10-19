import React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { ImageIcon, Upload, X, Banknote, CreditCard, ArrowLeftRight, Landmark, Plus, Trash2, Info, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Forms } from "@/types/form";
import { DEFAULT_PAYMENT_METHODS, IBAN_PATTERN, normalizeIban } from "@/utils/settings/store/metadata";
import { useQueryPaymentProviders } from "@/hooks/queries/useQueryPaymentProviders";
import { useStoreSettings } from "./hooks";
import ColorField from "./color-field";
import ProviderPicker from "./provider-picker";
import { useTranslation } from "@/i18n";
import SaveBar from "../save-bar";
import { useUnsavedChanges } from "@/hooks/utils/useUnsavedChanges";

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
      transferCounterparty: "",
      bankBeneficiary: "",
      bankName: "",
      bankIban: "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;
  const isDirty = useUnsavedChanges(form);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "paymentMethods",
  });
  const paymentMethods = useWatch({ control, name: "paymentMethods" });
  const hasTransferMethod = paymentMethods?.some(
    (m) => (m.type ?? m.icon) === "transfer"
  );
  const hasBankTransferMethod = paymentMethods?.some(
    (m) => (m.type ?? m.icon) === "bank_transfer"
  );

  const { data: installedProviders, isError: providersError } = useQueryPaymentProviders();
  const installedProviderIds = React.useMemo(
    () => new Set(providersError ? [] : installedProviders?.map((p) => p.id) ?? []),
    [installedProviders, providersError]
  );
  // Picked from what the backend has loaded; typed only when that list can't be read.
  const providerChoices = providersError
    ? []
    : (installedProviders ?? []).filter((p) => p.is_enabled !== false).map((p) => p.id);

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
                <FormItem data-setting="store-name">
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
                <FormItem data-setting="brand-name">
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

            <div data-setting="logo" className="flex flex-col gap-3">
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
                    <ImageIcon className="size-8 text-fg-subtle" />
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
                      className="text-danger-text"
                    >
                      <X className="w-4 h-4 mr-2" /> {t("settings.store.remove_logo_button")}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-base text-fg-muted">
                {t("settings.store.logo_requirements")}
              </p>
            </div>

            <FormField
              control={control}
              name="storeAddress"
              render={({ field }) => (
                <FormItem data-setting="store-address">
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
                <FormItem data-setting="store-phone">
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
                <FormItem data-setting="guest-email">
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

            <div data-setting="payment-methods" className="space-y-4">
              <Label className="text-lg font-medium">{t("settings.store.payment_methods_label")}</Label>
              <p className="text-base text-fg-muted">
                {t("settings.store.payment_methods_description")}
              </p>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4 rounded-lg border border-theme-border bg-surface p-4">
                    <div className="flex items-center gap-3">
                      <FormField
                        control={control}
                        name={`paymentMethods.${index}.enabled`}
                        render={({ field: enabledField }) => (
                          <FormItem className="flex items-center gap-3 space-y-0">
                            <FormControl>
                              <Switch
                                checked={enabledField.value}
                                onCheckedChange={(v) => enabledField.onChange(v === true)}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormLabel className="text-base font-medium">
                              {t("settings.store.payment_method_enabled")}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="ml-auto text-danger-text"
                        onClick={() => remove(index)}
                        disabled={isLoading || fields.length <= 1}
                      >
                        <Trash2 className="size-5" />
                        {t("common.remove")}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                          const usedElsewhere = new Set(
                            (paymentMethods ?? []).filter((_, i) => i !== index).map((m) => m.id)
                          );
                          return (
                            <FormItem className="min-w-0">
                              <FormLabel className="text-base">{t("settings.store.column_provider_id")}</FormLabel>
                              {providerChoices.length > 0 ? (
                                <ProviderPicker
                                  value={idValue}
                                  onChange={idField.onChange}
                                  providerIds={providerChoices}
                                  usedElsewhere={usedElsewhere}
                                  notInstalled={isUnknown}
                                  disabled={isLoading}
                                />
                              ) : (
                                <FormControl>
                                  <Input
                                    placeholder={t("settings.store.provider_id_placeholder")}
                                    className={`font-mono${isUnknown ? " border-warning" : ""}`}
                                    disabled={isLoading}
                                    {...idField}
                                  />
                                </FormControl>
                              )}
                              {providerChoices.length === 0 && isUnknown && (
                                <p className="flex items-center gap-2 text-base text-warning-text">
                                  <AlertTriangle className="size-5 shrink-0" />
                                  {t("settings.store.provider_id_not_installed")}
                                </p>
                              )}
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={control}
                        name={`paymentMethods.${index}.label`}
                        render={({ field: inputField }) => (
                          <FormItem className="min-w-0">
                            <FormLabel className="text-base">{t("settings.store.column_display_name")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("settings.store.display_name_placeholder")}
                                disabled={isLoading}
                                {...inputField}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.icon`}
                      render={({ field: iconField }) => (
                        <FormItem>
                          <FormLabel className="text-base">{t("settings.store.column_icon")}</FormLabel>
                          <SegmentedControl
                            label={t("settings.store.column_icon")}
                            className="w-full"
                            value={iconField.value ?? "card"}
                            onChange={iconField.onChange}
                            options={[
                              { value: "cash", label: t("settings.store.icon_cash"), icon: <Banknote />, disabled: isLoading },
                              { value: "card", label: t("settings.store.icon_card"), icon: <CreditCard />, disabled: isLoading },
                              { value: "transfer", label: t("settings.store.icon_transfer"), icon: <ArrowLeftRight />, disabled: isLoading },
                              { value: "bank_transfer", label: t("settings.store.icon_bank_transfer"), icon: <Landmark />, disabled: isLoading },
                            ]}
                          />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.type`}
                      render={({ field: typeField }) => (
                        <FormItem>
                          <FormLabel className="text-base">{t("settings.store.column_type")}</FormLabel>
                          <SegmentedControl
                            label={t("settings.store.column_type")}
                            className="w-full"
                            value={typeField.value ?? "card"}
                            onChange={typeField.onChange}
                            options={[
                              { value: "cash", label: t("settings.store.type_cash"), disabled: isLoading },
                              { value: "card", label: t("settings.store.type_card"), disabled: isLoading },
                              { value: "transfer", label: t("settings.store.type_transfer"), disabled: isLoading },
                              { value: "bank_transfer", label: t("settings.store.type_bank_transfer"), disabled: isLoading },
                            ]}
                          />
                        </FormItem>
                      )}
                    />
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
                  <Plus className="size-5" />
                  {t("settings.store.add_payment_method_button")}
                </Button>
              </div>
            </div>

            {hasTransferMethod && (
              <FormField
                control={control}
                name="transferCounterparty"
                render={({ field }) => (
                  <FormItem data-setting="transfer-counterparty">
                    <FormLabel className="text-lg font-medium flex items-center gap-2">
                      {t("settings.store.transfer_counterparty_label")}
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
                          {t("settings.store.transfer_counterparty_tooltip")}
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("settings.store.transfer_counterparty_placeholder")}
                        className="h-12 text-lg px-4"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {hasBankTransferMethod && (
              <div data-setting="bank-details" className="space-y-3">
                <div className="text-lg font-medium flex items-center gap-2">
                  {t("settings.store.bank_details_label")}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-surface-subtle"
                      >
                        <Info className="w-4 h-4 text-fg-subtle" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="max-w-xs text-left">
                      {t("settings.store.bank_details_tooltip")}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <FormField
                    control={control}
                    name="bankBeneficiary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t("settings.store.bank_beneficiary_label")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("settings.store.bank_beneficiary_placeholder")}
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
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t("settings.store.bank_name_label")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("settings.store.bank_name_placeholder")}
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
                    name="bankIban"
                    rules={{
                      validate: (value) =>
                        !value || IBAN_PATTERN.test(normalizeIban(value)) || t("settings.store.bank_iban_invalid"),
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t("settings.store.bank_iban_label")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="GE29NB0000000101904917"
                            className="h-12 text-lg px-4 font-mono uppercase"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-base" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="fontSize"
                render={({ field }) => (
                  <FormItem data-setting="font-size">
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

            <div data-setting="brand-colors" className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <SaveBar
              dirty={isDirty}
              saving={isSubmitting}
              disabled={isLoading}
              onDiscard={() => form.reset()}
              saveLabel={t("settings.store.save_button")}
              savingLabel={t("settings.store.saving")}
            />
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StoreSettings;
