import React from "react";
import { Loader2, Printer as PrinterIcon } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { usePrinterStatus } from "@/hooks/printer/usePrinterStatus";
import { printerStatusIntent } from "@/utils/pos/printer-status";
import type { Printer } from "@/components/settings/printer/hooks";
import { useTranslation } from "@/i18n";

interface Props {
  /** The printer to watch; the till's default printer when left out. */
  printer?: Printer;
  /** Draw nothing when the status can't be known (no printer, or a spooler printer). */
  hideUnknown?: boolean;
}

/** A printer's live state as icon + word + colour: ready, paper low, out of paper, offline… */
const PrinterStatusChip: React.FC<Props> = ({ printer, hideUnknown }) => {
  const { t } = useTranslation();
  const { data: kind, isPending } = usePrinterStatus(printer);

  if (isPending) {
    return (
      <StatusChip intent="neutral" icon={<Loader2 className="size-4 animate-spin" />}>
        {t("status.printer_checking")}
      </StatusChip>
    );
  }
  if (!kind || (hideUnknown && (kind === "unsupported" || kind === "none"))) return null;

  return (
    <StatusChip intent={printerStatusIntent(kind)} icon={<PrinterIcon className="size-4" />}>
      {t(`status.printer_${kind}`)}
    </StatusChip>
  );
};

export default PrinterStatusChip;
