import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import schemas from "@/utils/schemas";
import { coercedZodResolver } from "@/utils/schemas/resolver";
import { Forms } from "@/types/form";
import { t as translate } from "@/i18n";
import { useRegister } from "@/context/register";
import { useExpectedCash } from "@/hooks/register/useExpectedCash";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { movementTotals } from "@/utils/pos/register";
import { verifyManagerPin } from "@/utils/settings/preferences/pin";
import type { RegisterSession } from "@/types/register";

function buildSummary(
  session: RegisterSession,
  expected: number,
  counted: number,
  difference: number,
  note: string
): string {
  const { payins, drops } = movementTotals(session);
  const sales = expected - session.openingFloat - payins + drops;
  const f = (n: number) => n.toFixed(2);
  const lines = [
    "REGISTER CLOSE",
    `Opened:  ${new Date(session.openedAt).toLocaleString()}`,
    `Closed:  ${new Date().toLocaleString()}`,
    "",
    `Float:      ${f(session.openingFloat)}`,
    `Cash sales: ${f(sales)}`,
    `Pay-ins:    ${f(payins)}`,
    `Drops:     -${f(drops)}`,
    `Expected:   ${f(expected)}`,
    `Counted:    ${f(counted)}`,
    `Over/Short: ${difference >= 0 ? "+" : ""}${f(difference)} (${
      difference === 0 ? "BALANCED" : difference > 0 ? "OVER" : "SHORT"
    })`,
  ];
  if (note.trim()) lines.push(`Reason: ${note.trim()}`);
  return lines.join("\n");
}

export const useCloseRegister = (onDone: () => void) => {
  const {
    session,
    closeRegister,
    discrepancyThreshold,
    requirePinToClose,
    managerPinHash,
  } = useRegister();
  const { expectedCash, isLoading } = useExpectedCash(session);
  const { data: regionData } = useQueryRegion();
  const currency =
    regionData?.defaultRegion?.currency_code?.toUpperCase() ?? "USD";
  const { printReceiptText, getDefaultPrinter } = usePrinterService();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printSummary, setPrintSummary] = useState(true);

  const form = useForm<Forms["CloseRegister"]>({
    resolver: coercedZodResolver(schemas.closeRegister),
    defaultValues: { countedCash: 0, note: "", managerPin: "" },
  });

  const counted = Number(form.watch("countedCash")) || 0;
  // Until the cashier actually counts, keep the UI neutral (no scary red "short"
  // and no "reason required" on an untouched dialog). Submit still validates.
  const hasCounted = counted > 0;
  const difference = counted - expectedCash;
  const overThreshold = Math.abs(difference) > discrepancyThreshold;
  const pinRequired = requirePinToClose && !!managerPinHash;

  // Conditional rules (config-dependent, so enforced here not in the schema).
  // Runs before the confirm step so errors surface on the form, not after.
  const validateClose = useCallback(
    async (data: Forms["CloseRegister"]): Promise<boolean> => {
      if (!session) return false;
      if (overThreshold && !data.note?.trim()) {
        form.setError("note", {
          message: translate("register.close.reason_required"),
        });
        return false;
      }
      if (pinRequired) {
        const ok = data.managerPin
          ? await verifyManagerPin(data.managerPin, managerPinHash as string)
          : false;
        if (!ok) {
          form.setError("managerPin", {
            message: translate("register.close.pin_invalid"),
          });
          return false;
        }
      }
      return true;
    },
    [session, overThreshold, pinRequired, managerPinHash, form]
  );

  // Performs the actual close. Assumes validateClose already passed.
  const commitClose = useCallback(
    async (data: Forms["CloseRegister"]) => {
      if (!session) return;
      setIsSubmitting(true);
      try {
        const snapshot = expectedCash; // freeze before mutating
        await closeRegister({
          countedCash: data.countedCash,
          expectedCash: snapshot,
          note: data.note,
        });

        if (printSummary && getDefaultPrinter()) {
          try {
            await printReceiptText(
              buildSummary(
                session,
                snapshot,
                data.countedCash,
                data.countedCash - snapshot,
                data.note ?? ""
              )
            );
          } catch {
            toast.error(translate("register.close.print_failed"));
          }
        }

        toast.success(translate("register.close.success"));
        form.reset({ countedCash: 0, note: "", managerPin: "" });
        onDone();
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      session,
      expectedCash,
      printSummary,
      closeRegister,
      printReceiptText,
      getDefaultPrinter,
      form,
      onDone,
    ]
  );

  return {
    form,
    session,
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
  };
};
