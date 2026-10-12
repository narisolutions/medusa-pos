import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Numpad } from "@/components/ui/numpad";
import { formatPrice } from "@/utils/helpers";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { Button } from "@/components/ui/button";
import { useOpenRegister } from "./hooks";
import { useTranslation } from "@/i18n";

/**
 * Blocking dialog shown at app start on the first launch of each business day.
 * Cannot be dismissed — checkout stays gated until the register is open.
 */
const OpenRegisterDialog: React.FC = () => {
  const { form, isSubmitting, onSubmit } = useOpenRegister();
  const { t } = useTranslation();
  const { data: regionData } = useQueryRegion();
  const currency = regionData?.defaultRegion?.currency_code?.toUpperCase() ?? "USD";

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        preventOutsideClose
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t("register.open.title")}</DialogTitle>
          <DialogDescription>
            {t("register.open.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="openingFloat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("register.open.opening_float")}
                  </FormLabel>
                  <FormControl>
                    <output aria-live="polite" className="block rounded-lg border border-theme-border bg-surface-muted px-4 py-3 text-right text-amount tabular-nums text-fg">
                      {formatPrice(Number(field.value) || 0, currency)}
                    </output>
                  </FormControl>
                  <Numpad
                    value={field.value ? String(field.value) : ""}
                    onChange={field.onChange}
                    hideActions
                    maxDecimals={2}
                    className="pt-2"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="xl" loading={isSubmitting} className="w-full">
              {isSubmitting
                ? t("register.open.opening")
                : t("register.open.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default OpenRegisterDialog;
