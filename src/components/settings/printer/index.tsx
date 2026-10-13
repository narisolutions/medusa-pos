import React from "react";
import { Edit2Icon, Loader2, Plus, Trash2Icon, PrinterIcon, XCircle } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import PrinterStatusChip from "@/components/base/printer-status-chip";
import { Button } from "@/components/ui/button";

import { usePrinterModal } from "./dialog/hooks";
import { Printer, usePrinterSettings } from "./hooks";
import PrinterModal from "./dialog";
import { useTranslation } from "@/i18n";

const PrinterSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isOpen, editingPrinter, openModal, closeModal } = usePrinterModal();
  const {
    printers,
    isLoading,
    deletePrinter,
    handleSavePrinter,
    handleTestPrinter,
    testingPrinter,
    testResults,
    handleTestCashDrawer,
    testingCashDrawer,
    cashDrawerTestResults,
    getConnectionIcon,
    getConnectionTypeLabel,
  } = usePrinterSettings(editingPrinter);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-8">
        <div className="border-b border-theme-border pb-6">
          <p className="text-lg leading-relaxed text-fg-muted font-medium">
            {t("settings.printer.description")}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="size-8 border-2 border-theme-border-strong border-t-fg-muted rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-fg-subtle">{t("settings.printer.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  // The live state first, then what the last test print or drawer kick did.
  const renderStatus = (printer: Printer) => {
    const printResult = testResults[printer.id];
    const drawerResult = cashDrawerTestResults[printer.id];
    const testing = testingPrinter === printer.id || testingCashDrawer === printer.id;

    if (testing) {
      return (
        <StatusChip intent="neutral" icon={<Loader2 className="size-4 animate-spin" />}>
          {testingPrinter === printer.id ? t("settings.printer.testing_print") : t("settings.printer.testing_drawer")}
        </StatusChip>
      );
    }

    // Network and USB printers report their state live, so a test only adds news when it
    // failed. A system-queue printer can't report, so its last test is all there is to show.
    const isLive = printer.connectionType !== "local";
    const failures = [
      printResult && !printResult.success && { label: t("settings.printer.print_issue"), detail: printResult.message },
      drawerResult && !drawerResult.success && { label: t("settings.printer.drawer_issue"), detail: drawerResult.message },
    ].filter((f): f is { label: string; detail: string } => !!f);

    return (
      <div className="flex flex-col items-start gap-2">
        {isLive || (!printResult && !drawerResult) ? (
          <PrinterStatusChip printer={printer} />
        ) : (
          [
            printResult?.success && <StatusChip key="print" intent="success">{t("settings.printer.print_ok")}</StatusChip>,
            drawerResult?.success && <StatusChip key="drawer" intent="success">{t("settings.printer.drawer_ok")}</StatusChip>,
          ]
        )}
        {failures.map(({ label, detail }) => (
          <p key={label} className="flex items-start gap-2 text-base leading-snug text-danger-text">
            <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              {label}
              {detail && <span className="block text-fg-muted">{detail}</span>}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-theme-border pb-6">
        <p className="text-lg leading-relaxed text-fg-muted font-medium">
          {t("settings.printer.description")}
        </p>
        <Button
          onClick={() => openModal()}
          size="lg"
          className="px-8 text-lg"
        >
          <Plus className="size-5" />
          {t("settings.printer.add")}
        </Button>
      </div>

      {printers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <PrinterIcon className="size-16 text-fg-subtle mx-auto mb-6" />
            <h3 className="text-xl font-medium text-fg mb-3">
              {t("settings.printer.no_printers_title")}
            </h3>
            <p className="text-lg text-fg-muted mb-8 max-w-sm mx-auto">
              {t("settings.printer.no_printers_description")}
            </p>
            <Button
              onClick={() => openModal()}
              size="lg"
              className="px-8 text-lg"
            >
              <Plus className="size-5" />
              {t("settings.printer.add_first_printer")}
            </Button>
          </div>
        </div>
      ) : (
        // A list, not a table: each printer's details, status and actions wrap to fit any
        // display size instead of pushing the page sideways.
        <ul className="space-y-3">
          {printers.map((printer) => (
            <li
              key={printer.id}
              className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-lg border border-theme-border bg-surface p-5 shadow-sm"
            >
              <div className="min-w-56 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold text-fg">{printer.name}</span>
                  {printer.isDefault && (
                    <StatusChip intent="info">{t("settings.printer.default_badge")}</StatusChip>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-fg-muted">
                  <span className="flex items-center gap-2">
                    <PrinterIcon className="size-5" />
                    <span className="capitalize">{printer.type}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {getConnectionIcon(printer.connectionType)}
                    {getConnectionTypeLabel(printer.connectionType)}
                  </span>
                  <span className="break-all font-mono">
                    {printer.address}
                    {printer.port && `:${printer.port}`}
                  </span>
                </div>
              </div>
              <div className="min-w-48">{renderStatus(printer)}</div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleTestPrinter(printer)}
                  loading={testingPrinter === printer.id}
                  className="text-lg px-5"
                >
                  {t("settings.printer.test_button")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleTestCashDrawer(printer)}
                  loading={testingCashDrawer === printer.id}
                  className="text-lg px-5"
                >
                  {testingCashDrawer === printer.id ? t("settings.printer.opening") : t("settings.printer.test_drawer_button")}
                </Button>
                <Button variant="outline" size="icon" onClick={() => openModal(printer)} aria-label={t("common.edit")}>
                  <Edit2Icon className="size-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-danger-text"
                  onClick={async () => await deletePrinter(printer.id)}
                  aria-label={t("common.delete")}
                >
                  <Trash2Icon className="size-5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PrinterModal
        isOpen={isOpen}
        onClose={closeModal}
        onSave={handleSavePrinter}
        editingPrinter={editingPrinter}
      />
    </div>
  );
};

export default PrinterSettings;
