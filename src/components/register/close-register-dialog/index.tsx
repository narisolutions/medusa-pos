import React, { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Numpad } from "@/components/ui/numpad";
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
import { formatPrice } from "@/utils/helpers";
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
    printSummary,
    setPrintSummary,
    currency,
    validateClose,
    commitClose,
  } = useCloseRegister(forced ? noop : handleClose);

  const countedText = form.watch("countedCash");

  const [pending, setPending] = useState<
    Parameters<typeof commitClose>[0] | null
  >(null);

  const handleValidSubmit = form.handleSubmit(async (data) => {
    if (!validateClose(data)) return;
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
  // Balanced reads as good, over as "check it", short as a problem; always with the word.
  const diffIntent = difference === 0 ? "success" : difference > 0 ? "warning" : "danger";
  const diffClass = { success: "text-success-text", warning: "text-warning-text", danger: "text-danger-text" }[diffIntent];
  const diffPanel = {
    success: "border-success bg-success-subtle",
    warning: "border-warning bg-warning-subtle",
    danger: "border-danger bg-danger-subtle",
  }[diffIntent];
  const DiffIcon = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle }[diffIntent];

  return (
    <Dialog
      open={forced ? true : !!open}
      onOpenChange={forced ? undefined : (o) => (o ? onOpenChange?.(true) : handleClose())}
    >
      <DialogContent
        showCloseButton={!forced}
        preventOutsideClose={forced}
        className={`${step === "confirm" ? "max-w-md" : "max-w-4xl"} max-h-[94vh] overflow-y-auto`}
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
                <span className={`text-base font-semibold tabular-nums ${diffClass}`}>
                  {difference > 0 ? "+" : ""}
                  {formatPrice(difference, currency)} ({diffLabel})
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => setStep("form")}
              >
                {t("register.close.back")}
              </Button>
              <Button
                type="button"
                size="lg"
                className="flex-2"
                loading={isSubmitting}
                onClick={() => pending && commitClose(pending)}
              >
                {isSubmitting
                  ? t("register.close.closing")
                  : t("register.close.confirm_submit")}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            {/* Two columns so a close-out fits one screen: summary left, keypad right. */}
            <form onSubmit={handleValidSubmit} className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-theme-border bg-surface-muted px-4 py-3">
                    <div className="text-base text-fg-muted">{t("register.close.expected")}</div>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-[2rem] w-24" />
                    ) : (
                      <div className="text-amount tabular-nums text-fg">{formatPrice(expectedCash, currency)}</div>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="countedCash"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border-2 border-primary bg-surface px-4 py-3">
                        <FormLabel className="text-base font-normal text-fg-muted">
                          {t("register.close.counted")}
                        </FormLabel>
                        <FormControl>
                          <output aria-live="polite" className="block text-amount tabular-nums text-fg">
                            {formatPrice(Number(field.value) || 0, currency)}
                          </output>
                        </FormControl>
                        <FormMessage className="text-base" />
                      </FormItem>
                    )}
                  />
                </div>

                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : hasCounted ? (
                  <div role="status" className={`flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 ${diffPanel}`}>
                    <span className={`flex items-center gap-2 text-lg font-semibold ${diffClass}`}>
                      <DiffIcon className="size-6" aria-hidden />
                      {diffLabel}
                    </span>
                    <span className="text-amount tabular-nums text-fg">
                      {difference > 0 ? "+" : ""}
                      {formatPrice(difference, currency)}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-theme-border px-4 py-3 text-base text-fg-muted">
                    {t("register.close.difference")}: —
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        {t("register.close.reason")}
                        {hasCounted && overThreshold && (
                          <span className="text-danger-text"> *</span>
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
                        />
                      </FormControl>
                      <FormMessage className="text-base" />
                    </FormItem>
                  )}
                />

                <div className="flex min-h-tap items-center justify-between">
                  <span className="text-base text-fg">
                    {t("register.close.print_summary")}
                  </span>
                  <Switch
                    checked={printSummary}
                    onCheckedChange={setPrintSummary}
                  />
                </div>
              </div>

              <Numpad
                value={countedText ? String(countedText) : ""}
                // Typed text, coerced to a number by the schema on submit, as the old input's was.
                onChange={(value) => form.setValue("countedCash", value as unknown as number)}
                hideActions
                maxDecimals={2}
                className="self-center"
              />

              <div className="col-span-2 flex gap-3 pt-2">
                {!forced && (
                  <Button type="button" variant="outline" size="lg" className="flex-1" onClick={handleClose}>
                    {t("common.cancel")}
                  </Button>
                )}
                <Button type="submit" size="lg" className="flex-2" disabled={isLoading} loading={isSubmitting}>
                  {isSubmitting
                    ? t("register.close.closing")
                    : t("register.close.submit")}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CloseRegisterDialog;
