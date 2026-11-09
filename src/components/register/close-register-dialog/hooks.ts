import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import schemas from "@/utils/schemas";
import { coercedZodResolver } from "@/utils/schemas/resolver";
import { Forms } from "@/types/form";
import { t as translate } from "@/i18n";
import { useRegister } from "@/context/register";
import { useExpectedCash } from "@/hooks/register/useExpectedCash";
import { useRegisterReport } from "@/hooks/register/useRegisterReport";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { fromMinorUnits, toMinorUnits } from "@/utils/pos/pricing";

const EMPTY_FORM = { countedCash: 0, note: "", fiscalZRef: "" };

export const useCloseRegister = (onDone: () => void) => {
  const {
    session,
    closeRegister,
    markZPrinted,
    discrepancyThreshold,
    fiscalDevice,
  } = useRegister();
  const { expectedCash, report, isLoading, isError, refetch } = useExpectedCash(session);
  const { print, currency } = useRegisterReport();
  const { getDefaultPrinter } = usePrinterService();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printSummary, setPrintSummary] = useState(true);

  const form = useForm<Forms["CloseRegister"]>({
    resolver: coercedZodResolver(schemas.closeRegister),
    defaultValues: EMPTY_FORM,
  });

  const counted = Number(form.watch("countedCash")) || 0;
  // Until the cashier actually counts, keep the UI neutral (no scary red "short"
  // and no "reason required" on an untouched dialog). Submit still validates.
  const hasCounted = counted > 0;
  // In tetri: a float subtraction leaves 1e-14 and a balanced drawer reads SHORT.
  const difference = fromMinorUnits(toMinorUnits(counted) - toMinorUnits(expectedCash));
  const overThreshold = Math.abs(difference) > discrepancyThreshold;

  // Conditional rules (config-dependent, so enforced here not in the schema).
  // Runs before the confirm step so errors surface on the form, not after.
  const validateClose = useCallback(
    (data: Forms["CloseRegister"]): boolean => {
      if (!session || !report) return false;
      let valid = true;
      if (overThreshold && !data.note?.trim()) {
        form.setError("note", {
          message: translate("register.close.reason_required"),
        });
        valid = false;
      }
      const zRef = data.fiscalZRef?.trim() ?? "";
      if (fiscalDevice && !zRef) {
        form.setError("fiscalZRef", {
          message: translate("register.close.fiscal_z_ref_required"),
        });
        valid = false;
      } else if (fiscalDevice && !/^\d+$/.test(zRef)) {
        form.setError("fiscalZRef", {
          message: translate("register.close.fiscal_z_ref_digits"),
        });
        valid = false;
      }
      return valid;
    },
    [session, report, overThreshold, fiscalDevice, form]
  );

  // Performs the actual close. Assumes validateClose already passed.
  const commitClose = useCallback(
    async (data: Forms["CloseRegister"]) => {
      // Stale or missing sales would freeze wrong totals into the Z for good.
      if (!session || !report || isSubmitting || isError) return;
      setIsSubmitting(true);
      try {
        // The Z is these figures, frozen here; nothing recomputes them later.
        const closed = await closeRegister({
          countedCash: data.countedCash,
          expectedCash,
          note: data.note,
          fiscalZRef: fiscalDevice ? data.fiscalZRef : undefined,
          report,
        });

        // A failed print leaves the close standing; the Z reprints from History.
        if (closed && printSummary && getDefaultPrinter()) {
          if (await print({ kind: "z", session: closed, report: closed.report })) await markZPrinted(closed.id);
        }

        toast.success(translate("register.close.success"));
        form.reset(EMPTY_FORM);
        onDone();
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      session,
      report,
      isSubmitting,
      isError,
      expectedCash,
      fiscalDevice,
      printSummary,
      closeRegister,
      markZPrinted,
      print,
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
    salesFailed: isError,
    retrySales: refetch,
    expectedCash,
    counted,
    hasCounted,
    difference,
    overThreshold,
    fiscalDevice,
    printSummary,
    setPrintSummary,
    currency,
    validateClose,
    commitClose,
  };
};
