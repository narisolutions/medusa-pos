import React from "react";
import { Edit2Icon, Loader2, Plus, Trash2Icon, PrinterIcon } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  // The last test's outcome; there is no live link check, so "not tested" is said plainly.
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

    if (!printResult && !drawerResult) {
      return <StatusChip intent="neutral">{t("settings.printer.not_tested")}</StatusChip>;
    }

    return (
      <div className="flex flex-col items-start gap-2">
        {printResult && (
          <StatusChip intent={printResult.success ? "success" : "danger"}>
            {printResult.success ? t("settings.printer.print_ok") : t("settings.printer.print_issue")}
          </StatusChip>
        )}
        {drawerResult && (
          <StatusChip intent={drawerResult.success ? "success" : "danger"}>
            {drawerResult.success ? t("settings.printer.drawer_ok") : t("settings.printer.drawer_issue")}
          </StatusChip>
        )}
        {[printResult, drawerResult].map(
          (result, i) =>
            result?.success && result.message && (
              <span key={i} className="text-base text-fg-muted leading-snug">{result.message}</span>
            )
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="flex items-center justify-between border-b border-theme-border pb-6">
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
        <div className="flex-1 bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm flex flex-col">
          <Table className="h-full">
            <TableHeader className="bg-surface-muted shrink-0">
              <TableRow className="border-b border-theme-border hover:bg-transparent">
                <TableHead className="text-base font-semibold text-fg-muted py-4 px-4 first:pl-6">{t("settings.printer.column_name")}</TableHead>
                <TableHead className="text-base font-semibold text-fg-muted py-4 px-4">{t("settings.printer.column_type")}</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">{t("settings.printer.column_connection")}</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">{t("settings.printer.column_address")}</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">{t("settings.printer.column_status")}</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">{t("settings.printer.column_default")}</TableHead>
                <TableHead className="text-right text-lg font-semibold text-fg-muted py-6 px-6 last:pr-8">{t("settings.printer.column_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="flex-1 overflow-auto">
              {printers.map((printer) => (
                <TableRow 
                  key={printer.id} 
                  className="border-b border-theme-border hover:bg-surface-hover transition-colors duration-150"
                >
                  <TableCell className="text-lg text-fg py-6 px-6 first:pl-8 font-medium">
                    {printer.name}
                  </TableCell>
                  <TableCell className="text-lg text-fg py-6 px-6">
                    <div className="flex items-center space-x-3">
                      <PrinterIcon className="size-5 text-fg-subtle" />
                      <span className="capitalize">{printer.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-lg text-fg py-6 px-6">
                    <div className="flex items-center space-x-3">
                      {getConnectionIcon(printer.connectionType)}
                      <span>
                        {getConnectionTypeLabel(printer.connectionType)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-lg text-fg py-6 px-6">
                    <div className="text-lg font-mono">
                      {printer.address}
                      {printer.port && `:${printer.port}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-lg text-fg py-6 px-6">{renderStatus(printer)}</TableCell>
                  <TableCell className="text-lg text-fg py-6 px-6">
                    {printer.isDefault && (
                      <StatusChip intent="info">{t("settings.printer.default_badge")}</StatusChip>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-lg text-fg py-6 px-6 last:pr-8">
                    <div className="flex items-center justify-end space-x-3">
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
                      <Button
                        variant="outline"
                        onClick={() => openModal(printer)}
                        size="icon"
                        aria-label={t("common.edit")}
                      >
                        <Edit2Icon className="size-5" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => await deletePrinter(printer.id)}
                        size="icon"
                        className="text-danger-text"
                        aria-label={t("common.delete")}
                      >
                        <Trash2Icon className="size-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
