import { useState, useEffect } from "react";
import { Forms } from "@/types/form";
import { Wifi, Usb, Bluetooth, Monitor } from "lucide-react";
import storage from "@/utils/storage";
import { useTranslation } from "@/i18n";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQuerySalesChannel } from "@/hooks/queries/useQuerySalesChannel";
import { getBrandName } from "@/utils/settings/store/metadata";
import { getTauriInvokeErrorMessage } from "@/utils/helpers";
import { printerIssueStaffHintSettings } from "@/utils/helpers";
import { toast } from "sonner";

export type Printer = Forms["Printer"] & {
  id: string;
};

const usePrinterSettings = (editingPrinter: Printer | null) => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const { data: salesChannels } = useQuerySalesChannel();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [testingCashDrawer, setTestingCashDrawer] = useState<string | null>(null);
  const [cashDrawerTestResults, setCashDrawerTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      const stored = await storage.getItem<Printer[]>("printers");
      if (stored) {
        setPrinters(stored);
      }
    } catch (error) {
      console.error("Failed to load printers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrinters = async (newPrinters: Printer[]) => {
    try {
      await storage.setItem("printers", newPrinters);
      setPrinters(newPrinters);
    } catch (error) {
      console.error("Failed to save printers:", error);
    }
  };

  const handleSavePrinter = async (printerData: Omit<Printer, "id">) => {
    let updatedPrinters: Printer[];

    if (editingPrinter) {
      updatedPrinters = printers.map((printer) =>
        printer.id === editingPrinter.id ? { ...printerData, id: editingPrinter.id } : printer
      );
    } else {
      const newPrinter: Printer = { ...printerData, id: crypto.randomUUID() };
      updatedPrinters = [...printers, newPrinter];
    }

    if (printerData.isDefault) {
      updatedPrinters = updatedPrinters.map((p) =>
        p.id === (editingPrinter?.id || updatedPrinters[updatedPrinters.length - 1].id)
          ? p
          : { ...p, isDefault: false }
      );
    }

    await savePrinters(updatedPrinters);
  };

  const deletePrinter = async (id: string) => {
    await savePrinters(printers.filter((printer) => printer.id !== id));
  };

  const handleTestPrinter = async (printer: Printer) => {
    setTestingPrinter(printer.id);
    try {
      const salesChannelId = await storage.getItem("sales_channel_id");
      const salesChannelName =
        salesChannels?.find((sc) => sc.id === salesChannelId)?.name ?? null;

      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("print_test", {
        connectionType: printer.connectionType,
        address: printer.address,
        port: printer.port || null,
        vendorId: printer.vendorId ?? null,
        productId: printer.productId ?? null,
        companyName: getBrandName(store) || "POS",
        appVersion: import.meta.env.VITE_APP_VERSION ?? null,
        datetime: new Date().toLocaleString(),
        storeName: store?.name ?? null,
        salesChannelName,
      });

      setTestResults((prev) => ({
        ...prev,
        [printer.id]: { success: true, message: t("settings.printer.test_page_sent") },
      }));
    } catch (error) {
      const detail = getTauriInvokeErrorMessage(error, "Test failed");
      console.error("Printer test failed:", { printer: printer.name, detail });
      toast.error(t("settings.printer.print_issue"), {
        description: detail || printerIssueStaffHintSettings(printer.name),
      });
      setTestResults((prev) => ({
        ...prev,
        [printer.id]: {
          success: false,
          message: "",
        },
      }));
    } finally {
      setTestingPrinter(null);
    }
  };

  const handleTestCashDrawer = async (printer: Printer) => {
    setTestingCashDrawer(printer.id);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_cash_drawer", {
        connectionType: printer.connectionType,
        address: printer.address,
        port: printer.port || null,
        vendorId: printer.vendorId ?? null,
        productId: printer.productId ?? null,
      });
      setCashDrawerTestResults((prev) => ({
        ...prev,
        [printer.id]: { success: true, message: t("settings.printer.cash_drawer_signal_sent") },
      }));
    } catch (error) {
      const detail = getTauriInvokeErrorMessage(
        error,
        "Failed to open cash drawer"
      );
      console.error("Cash drawer test failed:", { printer: printer.name, detail });
      toast.error(t("settings.printer.drawer_issue"), {
        description: detail || printerIssueStaffHintSettings(printer.name),
      });
      setCashDrawerTestResults((prev) => ({
        ...prev,
        [printer.id]: {
          success: false,
          message: "",
        },
      }));
    } finally {
      setTestingCashDrawer(null);
    }
  };

  const getConnectionIcon = (connectionType: string) => {
    const icons = {
      local: <Monitor className="h-4 w-4" />,
      network: <Wifi className="h-4 w-4" />,
      usb: <Usb className="h-4 w-4" />,
      bluetooth: <Bluetooth className="h-4 w-4" />,
    };
    return icons[connectionType as keyof typeof icons] || null;
  };

  const getConnectionTypeLabel = (connectionType: string) => {
    const labels = {
      local: t("settings.printer.connection_local"),
      network: t("settings.printer.connection_network"),
      usb: t("settings.printer.connection_usb"),
      bluetooth: t("settings.printer.connection_bluetooth"),
    };
    return labels[connectionType as keyof typeof labels] || connectionType;
  };

  return {
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
  };
};

export { usePrinterSettings };