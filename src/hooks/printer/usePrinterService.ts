import { useState, useEffect, useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { buildReceipt, buildReceiptPDF, ReceiptData } from "@/utils/receipt";
import { toast } from "sonner";
import storage from "@/utils/storage";
import { Printer } from "@/components/settings/printer/hooks";
import { handleErrorToast, openDownloadsFolder } from "@/utils/helpers";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getBrandName, getStoreAddress, getStoreAddress2, getStorePhone } from "@/utils/store/metadata";

const usePrinterService = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: store } = useQueryStore();

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

  const getDefaultPrinter = useCallback((): Printer | null => {
    return printers.find((printer) => printer.isDefault) || null;
  }, [printers]);

  const savePrinters = async (printersToSave: Printer[]) => {
    try {
      await storage.setItem("printers", printersToSave);
      setPrinters(printersToSave);
    } catch (error) {
      console.error("Failed to save printers:", error);
      throw new Error("Failed to save printer configuration");
    }
  };

  const printReceiptText = useCallback(
    async (receiptText: string, printer?: Printer) => {
      const targetPrinter = printer || getDefaultPrinter();

      if (!targetPrinter) {
        throw new Error(
          "No printer specified and no default printer configured"
        );
      }

      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("print_receipt", {
          connectionType: targetPrinter.connectionType,
          address: targetPrinter.address,
          port: targetPrinter.port || null,
          receiptData: receiptText,
          companyName: getBrandName(store) || "POS",
        });
        return { success: true, message: "Receipt printed successfully" };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to print receipt";
        console.error("Print error:", errorMessage);
        throw new Error(errorMessage);
      }
    },
    [getDefaultPrinter, store]
  );

  const openCashDrawer = useCallback(
    async (printer?: Printer) => {
      const targetPrinter = printer || getDefaultPrinter();

      if (!targetPrinter) {
        throw new Error(
          "No printer specified and no default printer configured"
        );
      }

      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("open_cash_drawer", {
          connectionType: targetPrinter.connectionType,
          address: targetPrinter.address,
          port: targetPrinter.port || null,
        });
        toast.success("Cash drawer opened");
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to open cash drawer";
        console.error("Cash drawer error:", errorMessage);
        handleErrorToast(`Cash drawer failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    },
    [getDefaultPrinter]
  );

  // Helper function to build receipt data from order
  const buildReceiptDataFromOrder = useCallback((order: AdminOrder): ReceiptData => {
    const receiptItems = order.items || [];

    // Calculate item discounts from metadata
    let itemDiscountsTotal = 0;
    receiptItems.forEach((item) => {
      const itemMetadata = item.metadata as
        | {
            item_discount?: { type: "amount" | "percent"; value: number };
            original_price?: number;
          }
        | undefined;

      if (itemMetadata?.item_discount) {
        const discount = itemMetadata.item_discount;
        const quantity = item.quantity || 1;

        if (discount.type === "amount") {
          itemDiscountsTotal += discount.value * quantity;
        } else if (discount.type === "percent") {
          const originalPrice =
            itemMetadata.original_price || item.unit_price || 0;
          const discountAmount = (originalPrice * discount.value) / 100;
          itemDiscountsTotal += discountAmount * quantity;
        }
      }
    });

    const subtotal = order.subtotal || 0;
    const tax = order.tax_total || 0;
    const total = order.total || 0;
    const discount = (order.discount_total || 0) + itemDiscountsTotal;
    const cashPaid: number = typeof order.metadata?.cash_paid === "number" 
      ? order.metadata.cash_paid 
      : 0;
    
    const providerId = order.payment_collections?.[0]?.payment_sessions?.[0]?.provider_id;
    const paymentMethod =
      providerId === "pp_system_default" && order.metadata?.payment_method
        ? String(order.metadata.payment_method).toLowerCase()
        : providerId;

    const amountPaid: number =
      paymentMethod === "pp_cash_pos" && cashPaid > 0
        ? cashPaid
        : total;

    const change: number =
      paymentMethod === "pp_cash_pos" && cashPaid > 0
        ? Math.max(0, cashPaid - total)
        : 0;

    return {
      storeName: store?.name ?? "POS",
      companyName: getBrandName(store) || "POS",
      storeAddress: getStoreAddress(store) ?? "",
      storeAddress2: getStoreAddress2(store) ?? undefined,
      storePhone: getStorePhone(store) ?? "",
      orderDisplayId: order.display_id?.toString() || "N/A",
      customerEmail: order.email || order.customer?.email || undefined,
      customerName:
        order.customer?.first_name && order.customer?.last_name
          ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
          : undefined,
      items: receiptItems,
      subtotal,
      tax,
      taxRate: 18,
      discount,
      total,
      currency: "GEL",
      paymentMethod: paymentMethod?.toUpperCase() || 'PP_CASH_POS',
      amountPaid,
      change,
      footer: "Thank you for your business!",
    };
  }, [store]);

  const printOrderReceipt = useCallback(
    async (
      order: AdminOrder,
    ) => {
      const printer: Printer | null = getDefaultPrinter() || null;

      if (!printer) {
        throw new Error("No printer specified and no default printer configured");
      }

      try {
        const receiptData = buildReceiptDataFromOrder(order);
        const receiptText = buildReceipt(receiptData);
        await printReceiptText(receiptText, printer);

        toast.success("Receipt printed successfully!");

        return { success: true, receiptData };
      } catch (error) {
        console.error("Failed to print receipt:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to print receipt";
        handleErrorToast(`Print failed: ${errorMessage}`);

        throw error;
      }
    },
    [getDefaultPrinter, printReceiptText, buildReceiptDataFromOrder]
  );

  const downloadReceiptAsPDF = useCallback(
    async (order: AdminOrder): Promise<void> => {
      try {
        const receiptData = buildReceiptDataFromOrder(order);
        const pdfBytes = buildReceiptPDF(receiptData);

        // Generate filename
        const orderId = order.display_id?.toString() || "N/A";
        const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
        const filename = `receipt-${orderId}-${timestamp}.pdf`;

        // Save PDF to Downloads folder
        const fs = await import("@tauri-apps/plugin-fs");
        await fs.writeFile(filename, pdfBytes, {
          baseDir: fs.BaseDirectory.Download,
        });

        toast.success(`Receipt downloaded successfully: ${filename}`, {
          description: "Saved to your Downloads folder",
          action: {
            label: "Open Folder",
            onClick: () => openDownloadsFolder(filename),
          },
        });
      } catch (error) {
        console.error("Failed to download receipt as PDF:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to download receipt";
        handleErrorToast(`Download failed: ${errorMessage}`);
        throw error;
      }
    },
    [buildReceiptDataFromOrder]
  );

  return {
    printers,
    isLoading,
    getDefaultPrinter,
    printReceiptText,
    printOrderReceipt,
    downloadReceiptAsPDF,
    openCashDrawer,
    savePrinters,
    refreshPrinters: loadPrinters,
  };
};

export { usePrinterService };
