import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { ImageIcon, Upload, X, Banknote, CreditCard, Plus, Trash2, Info } from "lucide-react";

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
import { useStoreSettings } from "./hooks";
import ColorField from "./color-field";

const StoreSettings: React.FC = () => {
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
          Configure store branding and display defaults
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
                    Store Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Store"
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
                    Brand / POS Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Example POS"
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3">
              <Label className="text-lg font-medium">Store Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed border-theme-border-strong rounded-lg flex items-center justify-center bg-surface-subtle shrink-0 overflow-hidden">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt="Logo preview"
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
                    {isPickingLogo ? "Opening..." : "Choose Logo"}
                  </Button>
                  {currentLogoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveLogo}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4 mr-2" /> Remove Logo
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-fg-muted">
                PNG, JPG, JPEG, SVG, or WebP (max 256 KB). Displayed in the app
                header.
              </p>
            </div>

            <FormField
              control={control}
              name="storeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    Store Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St, City, Country"
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
                    Store Address Line 2
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Suite 100, Floor 2, etc."
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
                    Store Phone
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+1 555 000 0000"
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
                    Guest customer email
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
                        Used when creating anonymous POS orders with no attached
                        customer. Required so receipts and orders have a
                        valid email.
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="guest@example.com"
                      className="h-12 text-lg px-4"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Label className="text-lg font-medium">Payment Methods</Label>
              <p className="text-sm text-fg-muted">
                Add, remove, or customize payment methods. Provider ID must match your Medusa backend (e.g. pp_cash_pos).
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
                      render={({ field: idField }) => (
                        <FormItem className="w-48 shrink-0">
                          <FormControl>
                            <Input
                              placeholder="Provider ID"
                              className="h-10 font-mono text-sm"
                              disabled={isLoading}
                              {...idField}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`paymentMethods.${index}.label`}
                      render={({ field: inputField }) => (
                        <FormItem className="flex-1 min-w-0">
                          <FormControl>
                            <Input
                              placeholder="Display name"
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
                                <SelectValue placeholder="Icon" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">
                                <span className="flex items-center gap-2">
                                  <Banknote className="w-4 h-4" /> Cash
                                </span>
                              </SelectItem>
                              <SelectItem value="card">
                                <span className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" /> Card
                                </span>
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
                      aria-label="Remove payment method"
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
                    })
                  }
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add payment method
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
                      Base Font Size (px)
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
                    label="Primary Color"
                    value={field.value}
                    placeholder="#7f1d1d"
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
                    label="Secondary Color"
                    value={field.value}
                    placeholder="#1f2937"
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
              {isSubmitting ? "Saving..." : "Save Store Settings"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StoreSettings;
