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
import { Input } from "@/components/ui/input";
import { Numpad } from "@/components/ui/numpad";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatPrice } from "@/utils/helpers";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { Button } from "@/components/ui/button";
import { useCashMovement } from "./hooks";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CashMovementDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { data: regionData } = useQueryRegion();
  const currency = regionData?.defaultRegion?.currency_code?.toUpperCase() ?? "USD";
  const { form, isSubmitting, onSubmit } = useCashMovement(() =>
    onOpenChange(false)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("register.movement.title")}</DialogTitle>
          <DialogDescription>
            {t("register.movement.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("register.movement.type")}
                  </FormLabel>
                  <SegmentedControl
                    label={t("register.movement.type")}
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "drop", label: t("register.movement.drop"), icon: <ArrowUpFromLine /> },
                      { value: "payin", label: t("register.movement.payin"), icon: <ArrowDownToLine /> },
                    ]}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("register.movement.amount")}
                  </FormLabel>
                  <FormControl>
                    <output aria-live="polite" className="block rounded-lg border border-theme-border bg-surface-muted px-4 py-3 text-right text-amount tabular-nums text-fg">
                      {formatPrice(Number(field.value) || 0, currency)}
                    </output>
                  </FormControl>
                  <FormMessage className="text-base" />
                  <Numpad
                    value={field.value ? String(field.value) : ""}
                    onChange={field.onChange}
                    hideActions
                    maxDecimals={2}
                    className="pt-2"
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("register.movement.reason")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" size="lg" loading={isSubmitting} className="flex-2">
                {t("register.movement.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CashMovementDialog;
