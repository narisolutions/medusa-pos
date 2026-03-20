import { useState, useEffect } from "react";
import { Forms } from "@/types/form";
import { Wifi, Usb, Bluetooth } from "lucide-react";
import storage from "@/utils/storage";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQuerySalesChannel } from "@/hooks/queries/useQuerySalesChannel";
import { getBrandName } from "@/utils/store/metadata";

export type Printer = Forms["Printer"] & {
  id: string;
};

const usePrinterSettings = (editingPrinter: Printer | null) => {
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
        companyName: getBrandName(store) || "POS",
        appVersion: import.meta.env.VITE_APP_VERSION ?? null,
        datetime: new Date().toLocaleString(),
        storeName: store?.name ?? null,
        salesChannelName,
      });

      setTestResults((prev) => ({
        ...prev,
        [printer.id]: { success: true, message: "Test successful" },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [printer.id]: {
          success: false,
          message: error instanceof Error ? error.message : "Test failed",
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
      });
      setCashDrawerTestResults((prev) => ({
        ...prev,
        [printer.id]: { success: true, message: "Drawer opened" },
      }));
    } catch (error) {
      setCashDrawerTestResults((prev) => ({
        ...prev,
        [printer.id]: {
          success: false,
          message: error instanceof Error ? error.message : "Failed",
        },
      }));
    } finally {
      setTestingCashDrawer(null);
    }
  };

  const getConnectionIcon = (connectionType: string) => {
    const icons = {
      network: <Wifi className="h-4 w-4" />,
      usb: <Usb className="h-4 w-4" />,
      bluetooth: <Bluetooth className="h-4 w-4" />,
    };
    return icons[connectionType as keyof typeof icons] || null;
  };

  const getConnectionTypeLabel = (connectionType: string) => {
    const labels = {
      network: "Network",
      usb: "USB",
      bluetooth: "Bluetooth",
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