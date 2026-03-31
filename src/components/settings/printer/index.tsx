import React from "react";
import { Edit2Icon, Plus, Trash2Icon, PrinterIcon } from "lucide-react";
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

const PrinterSettings: React.FC = () => {
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
    getConnectionIcon,
    getConnectionTypeLabel,
  } = usePrinterSettings(editingPrinter);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full space-y-8">
        <div className="border-b border-theme-border pb-6">
          <p className="text-lg leading-relaxed text-fg-muted font-medium">
            Manage your printing devices and configurations
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-theme-border-strong border-t-fg-muted rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-fg-subtle">Loading printers...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderStatus = (printer: Printer) => {
    if (testingPrinter === printer.id) {
      return (
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 border-2 border-theme-border-strong border-t-fg-muted rounded-full animate-spin"></div>
          <span className="text-lg text-fg-subtle">Testing...</span>
        </div>
      );
    }

    const result = testResults[printer.id];
    if (result) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center space-x-3">
            <div
              className={`h-3 w-3 rounded-full ${result.success ? "bg-green-500" : "bg-red-500"}`}
            />
            <span
              className={`text-lg ${result.success ? "text-green-600" : "text-red-600"}`}
            >
              {result.success ? "Online" : "Offline"}
            </span>
          </div>
          {!result.success && result.message && (
            <span className="text-sm text-red-500 max-w-[260px] truncate" title={result.message}>
              {result.message}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-3">
        <div className="h-3 w-3 rounded-full bg-surface-subtle" />
        <span className="text-lg text-fg-subtle">Unknown</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="flex items-center justify-between border-b border-theme-border pb-6">
        <p className="text-lg leading-relaxed text-fg-muted font-medium">
          Manage your printing devices and configurations
        </p>
        <Button
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-lg font-medium min-w-[48px]"
        >
          <Plus className="h-5 w-5 mr-3" />
          Add Printer
        </Button>
      </div>

      {printers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <PrinterIcon className="h-16 w-16 text-fg-subtle mx-auto mb-6" />
            <h3 className="text-xl font-medium text-fg mb-3">
              No printers configured
            </h3>
            <p className="text-lg text-fg-muted mb-8 max-w-sm mx-auto">
              Get started by adding your first printer device to begin printing receipts.
            </p>
            <Button 
              onClick={() => openModal()}
              className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-lg font-medium min-w-[48px]"
            >
              <Plus className="h-5 w-5 mr-3" />
              Add Your First Printer
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm flex flex-col">
          <Table className="h-full">
            <TableHeader className="bg-surface-muted shrink-0">
              <TableRow className="border-b border-theme-border hover:bg-transparent">
                <TableHead className="text-base font-semibold text-fg-muted py-4 px-4 first:pl-6">Name</TableHead>
                <TableHead className="text-base font-semibold text-fg-muted py-4 px-4">Type</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">Connection</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">Address</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">Status</TableHead>
                <TableHead className="text-lg font-semibold text-fg-muted py-6 px-6">Default</TableHead>
                <TableHead className="text-right text-lg font-semibold text-fg-muted py-6 px-6 last:pr-8">Actions</TableHead>
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
                      <PrinterIcon className="h-5 w-5 text-fg-subtle" />
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
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-white">
                        Default
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-lg text-fg py-6 px-6 last:pr-8">
                    <div className="flex items-center justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => handleTestPrinter(printer)}
                        disabled={testingPrinter === printer.id}
                        className="text-lg h-11 px-4 min-w-[48px]"
                      >
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleTestCashDrawer(printer)}
                        disabled={testingCashDrawer === printer.id}
                        className="text-lg h-11 px-4 min-w-[48px]"
                      >
                        {testingCashDrawer === printer.id ? "Opening..." : "Test drawer"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openModal(printer)}
                        className="text-lg h-11 px-4 min-w-[48px]"
                      >
                        <Edit2Icon className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => await deletePrinter(printer.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-lg h-11 px-4 min-w-[48px]"
                      >
                        <Trash2Icon className="h-5 w-5" />
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
