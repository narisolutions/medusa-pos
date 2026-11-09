import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import schemas from "@/utils/schemas";
import { coercedZodResolver } from "@/utils/schemas/resolver";
import { Forms } from "@/types/form";
import { useRegister } from "@/context/register";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { cashDrawerIssueStaffHintToast } from "@/utils/helpers";

/** Logs the no-sale first, so a drawer that opens is never unaccounted for, then opens the drawer. */
export const useNoSale = (onLogged: () => void) => {
  const { t } = useTranslation();
  const { addMovement } = useRegister();
  const { openCashDrawer, getDefaultPrinter } = usePrinterService();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Forms["NoSale"]>({
    resolver: coercedZodResolver(schemas.noSale),
    defaultValues: { reason: "" },
  });

  const onSubmit = useCallback(
    async (data: Forms["NoSale"]) => {
      setIsSubmitting(true);
      try {
        await addMovement("no_sale", 0, data.reason.trim());
        form.reset({ reason: "" });
        onLogged();
        const printer = getDefaultPrinter();
        try {
          await openCashDrawer();
        } catch {
          toast.error(t("checkout.cash_drawer_error_title"), {
            description: printer ? cashDrawerIssueStaffHintToast(printer.name) : t("checkout.no_default_printer"),
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [addMovement, form, onLogged, openCashDrawer, getDefaultPrinter, t]
  );

  return { form, isSubmitting, onSubmit };
};
