import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileDown, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReceiptPreview from "@/components/base/receipt-preview";
import { useRegisterReport } from "@/hooks/register/useRegisterReport";
import { useRegister } from "@/context/register";
import { queryKeys } from "@/config/query";
import { useTranslation } from "@/i18n";
import type { RegisterSession, SessionReport } from "@/types/register";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "x" | "z";
  session: RegisterSession | null;
  report?: SessionReport | null;
  /** The X waits for the session's orders rather than show partial figures. */
  isLoading?: boolean;
  /** The orders did not load: zeros would look like real figures, so nothing is shown. */
  failed?: boolean;
};

/** Preview-first X or Z: the paper as it will print, then Print or PDF. A Z already printed on paper says REPRINT. */
const ReportPreviewDialog = ({ open, onOpenChange, kind, session, report, isLoading = false, failed = false }: Props) => {
  const { t } = useTranslation();
  const { buildText, print, savePdf, preview } = useRegisterReport();
  const { markZPrinted } = useRegister();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);
  // Covers the press right after a first print, before History re-reads the stored flag.
  const [printedId, setPrintedId] = useState<string | null>(null);

  const printedOnce = !!session && printedId === session.id;
  const input = session
    ? { kind, session, report, reprint: kind === "z" && (printedOnce || !!session.zPrintedAt) }
    : null;
  const ready = !!input && !isLoading && !failed;

  const run = async (action: "print" | "pdf") => {
    if (!input) return;
    setBusy(action);
    try {
      if (action === "pdf") await savePdf(input);
      else if ((await print(input)) && kind === "z") {
        setPrintedId(input.session.id);
        await markZPrinted(input.session.id);
        void queryClient.invalidateQueries({ queryKey: queryKeys.registerHistory });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{kind === "x" ? t("register.report.x_dialog_title") : t("register.report.z_dialog_title")}</DialogTitle>
          <DialogDescription>
            {kind === "x" ? t("register.report.x_dialog_description") : t("register.report.z_dialog_description")}
          </DialogDescription>
        </DialogHeader>

        {ready ? (
          <ReceiptPreview text={buildText(input)} {...preview} />
        ) : failed ? (
          <p role="alert" className="rounded-lg border-2 border-danger bg-danger-subtle px-4 py-3 text-base text-danger-text">
            {t("register.report.load_failed")}
          </p>
        ) : (
          <div role="status" className="space-y-3">
            <p className="text-base text-fg-muted">{t("register.report.loading")}</p>
            <Skeleton className="h-96 w-full" />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 gap-2"
            disabled={!ready || busy !== null}
            loading={busy === "pdf"}
            onClick={() => void run("pdf")}
          >
            <FileDown className="size-5" />
            {t("register.report.pdf")}
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1 gap-2"
            disabled={!ready || busy !== null}
            loading={busy === "print"}
            onClick={() => void run("print")}
          >
            <Printer className="size-5" />
            {t("register.report.print")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewDialog;
