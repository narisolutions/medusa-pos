import React, { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloseRegister } from "./hooks";
import { formatPrice } from "@/utils/settings/preferences";
import { useTranslation } from "@/i18n";

type Props = {
  /** Forced reconcile of a stale prior-day session — not dismissable. */
  forced?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// Stable no-op for the forced flow (a forced reconcile has nothing to close to),
// so the close callback identity stays constant across renders.
const noop = () => {};

const CloseRegisterDialog: React.FC<Props> = ({
  forced = false,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();

  // Two-step for a normal close: count → confirm (it ends the business day).
  // A forced (stale prior-day) reconcile is mandatory, so it skips the confirm.
  const [step, setStep] = useState<"form" | "confirm">("form");

  // Closing always resets back to the count step so a reopened dialog is fresh.
  const handleClose = useCallback(() => {
    setStep("form");
    onOpenChange?.(false);
  }, [onOpenChange]);

  const {
    form,
    isSubmitting,
    isLoading,
    expectedCash,
    counted,
    hasCounted,
    difference,
    overThreshold,
    pinRequired,
    printSummary,
    setPrintSummary,
    currency,
    validateClose,
    commitClose,
  } = useCloseRegister(forced ? noop : handleClose);

  const [pending, setPending] = useState<
    Parameters<typeof commitClose>[0] | null
  >(null);

  const handleValidSubmit = form.handleSubmit(async (data) => {
    if (!(await validateClose(data))) return;
    if (forced) {
      await commitClose(data);
      return;
    }
    setPending(data);
    setStep("confirm");
  });

  const diffLabel =
    difference === 0
      ? t("register.close.balanced")
      : difference > 0
        ? t("register.close.over")
        : t("register.close.short");
  const diffClass =
    difference === 0
      ? "text-fg"
      : difference > 0
        ? "text-green-600"
        : "text-red-600";

  return (
    <Dialog
      open={forced ? true : !!open}
      onOpenChange={forced ? undefined : (o) => (o ? onOpenChange?.(true) : handleClose())}
    >
      <DialogContent
        showCloseButton={!forced}
        preventOutsideClose={forced}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>
            {step === "confirm"
              ? t("register.close.confirm_title")
              : forced
                ? t("register.close.reconcile_title")
                : t("register.close.title")}
          </DialogTitle>
          <DialogDescription>
            {step === "confirm"
              ? t("register.close.confirm_warning")
              : forced
                ? t("register.close.reconcile_description")
                : t("register.close.description")}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-md bg-(--color-bg-base) px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-base text-fg-muted">
                  {t("register.close.expected")}
                </span>
                <span className="text-base font-semibold text-fg">
                  {formatPrice(expectedCash, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-fg-muted">
                  {t("register.close.counted")}
                </span>
                <span className="text-base font-semibold text-fg">
                  {formatPrice(counted, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-fg-muted">
                  {t("register.close.difference")}
                </span>
                <span className={`text-base font-semibold ${diffClass}`}>
                  {difference > 0 ? "+" : ""}
                  {formatPrice(difference, currency)} ({diffLabel})
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setStep("form")}
              >
                {t("register.close.back")}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                className="text-white bg-primary hover:bg-primary/90"
                onClick={() => pending && commitClose(pending)}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting
                  ? t("register.close.closing")
                  : t("register.close.confirm_submit")}
              </Button>
            </div>
          </div>
        ) : (
          <>
        <div className="flex items-center justify-between rounded-md bg-(--color-bg-base) px-4 py-3">
          <span className="text-base text-fg-muted">
            {t("register.close.expected")}
          </span>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <span className="text-lg font-semibold text-fg">
              {formatPrice(expectedCash, currency)}
            </span>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={handleValidSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="countedCash"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("register.close.counted")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      autoFocus
                      placeholder="0.00"
                      value={field.value === 0 ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <span className="text-base text-fg-muted">
                {t("register.close.difference")}
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : hasCounted ? (
                <span className={`text-lg font-semibold ${diffClass}`}>
                  {difference > 0 ? "+" : ""}
                  {formatPrice(difference, currency)} ({diffLabel})
                </span>
              ) : (
                <span className="text-lg font-semibold text-fg-subtle">—</span>
              )}
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("register.close.reason")}
                    {hasCounted && overThreshold && (
                      <span className="text-red-600"> *</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={
                        hasCounted && overThreshold
                          ? t("register.close.reason_required")
                          : t("register.close.reason_optional")
                      }
                      className="h-11 text-base"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            {pinRequired && (
              <FormField
                control={form.control}
                name="managerPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      {t("register.close.manager_pin")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/\D/g, ""))
                        }
                        className="h-11 text-base"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center justify-between">
              <span className="text-base text-fg-muted">
                {t("register.close.print_summary")}
              </span>
              <Switch
                checked={printSummary}
                onCheckedChange={setPrintSummary}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {!forced && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  {t("common.cancel")}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="text-white bg-primary hover:bg-primary/90"
              >
                {isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {isSubmitting
                  ? t("register.close.closing")
                  : t("register.close.submit")}
              </Button>
            </div>
          </form>
        </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CloseRegisterDialog;
