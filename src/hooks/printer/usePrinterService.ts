import { useState, useEffect, useCallback } from "react";
import { AdminOrder } from "@medusajs/types";
import { buildReceipt, buildReceiptPDF, ReceiptData, DEFAULT_RECEIPT_LABELS } from "@/utils/pos/receipt";
import { useTranslation } from "@/i18n";
import { toast } from "sonner";
import storage from "@/utils/storage";
import { Printer } from "@/components/settings/printer/hooks";
import {
  getTauriInvokeErrorMessage,
  openDownloadsFolder,
} from "@/utils/helpers";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import {
  getBrandName,
  getStoreAddress,
  getStoreAddress2,
  getStorePhone,
  getGuestCustomerEmail,
  getPaymentMethodsForSettings,
} from "@/utils/settings/store/metadata";
import constants from "@/utils/constants";

const usePrinterService = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: store } = useQueryStore();
  const { t } = useTranslation();

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
          vendorId: targetPrinter.vendorId ?? null,
          productId: targetPrinter.productId ?? null,
          receiptData: receiptText,
          companyName: getBrandName(store) || "POS",
        });
        return { success: true, message: "Receipt printed successfully" };
      } catch (error) {
        const errorMessage = getTauriInvokeErrorMessage(
          error,
          "Failed to print receipt"
        );
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
          vendorId: targetPrinter.vendorId ?? null,
          productId: targetPrinter.productId ?? null,
        });
        return { success: true };
      } catch (error) {
        const errorMessage = getTauriInvokeErrorMessage(
          error,
          "Failed to open cash drawer"
        );
        console.error(
          "Cash drawer error:",
          { printer: targetPrinter.name, detail: errorMessage }
        );
        throw new Error(errorMessage);
      }
    },
    [getDefaultPrinter]
  );

  // Helper function to build receipt data from order
  const buildReceiptDataFromOrder = useCallback((order: AdminOrder): ReceiptData => {
    // Map items, computing discount_total per item from metadata
    const mappedReceiptItems = (order.items || []).map((item) => {
      const itemMeta = item.metadata as
        | {
            item_discount?: { type: "amount" | "percent"; value: number };
            original_unit_price?: number;
          }
        | undefined;
      let itemDiscountAmount = 0;
      if (itemMeta?.item_discount) {
        const { type, value } = itemMeta.item_discount;
        const qty = item.quantity || 1;
        if (type === "amount") {
          itemDiscountAmount = value * qty;
        } else {
          const base = itemMeta.original_unit_price ?? item.unit_price ?? 0;
          itemDiscountAmount = (base * value / 100) * qty;
        }
      }
      return {
        ...item,
        discount_total: itemDiscountAmount > 0 ? itemDiscountAmount : (item.discount_total || 0),
      };
    });

    // Sum item-level discounts
    const itemDiscountsTotal = mappedReceiptItems.reduce(
      (acc, item) => acc + (item.discount_total || 0),
      0
    );

    // Add order-level discount from metadata
    const orderMeta = order.metadata as
      | { order_discount?: { type: "amount" | "percent"; value: number } }
      | null
      | undefined;
    let orderDiscountAmount = 0;
    if (orderMeta?.order_discount?.value) {
      const { type, value } = orderMeta.order_discount;
      const base = (order.subtotal || 0) - itemDiscountsTotal;
      orderDiscountAmount = type === "percent"
        ? (base * value) / 100
        : Math.min(value, base);
    }

    const subtotal = order.subtotal || 0;
    const tax = order.tax_total || 0;
    const total = order.total || 0;
    const discount = (order.discount_total || 0) + itemDiscountsTotal + orderDiscountAmount;
    const cashPaid: number = typeof order.metadata?.cash_paid === "number" 
      ? order.metadata.cash_paid 
      : 0;
    
    const providerId = order.payment_collections?.[0]?.payment_sessions?.[0]?.provider_id;
    const paymentMethodId =
      providerId === "pp_system_default" && order.metadata?.payment_method
        ? String(order.metadata.payment_method).toLowerCase()
        : providerId;

    const configuredMethods = getPaymentMethodsForSettings(store);
    const paymentMethodLabel =
      configuredMethods.find(
        (m) => m.id?.toLowerCase() === paymentMethodId?.toLowerCase()
      )?.label ?? paymentMethodId ?? "PP_CASH_POS";

    const amountPaid: number =
      paymentMethodId === "pp_cash_pos" && cashPaid > 0
        ? cashPaid
        : total;

    const change: number =
    
      paymentMethodId === "pp_cash_pos" && cashPaid > 0
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
      guestEmail: getGuestCustomerEmail(store),
      items: mappedReceiptItems,
      subtotal,
      tax,
      taxRate: 18,
      discount,
      total,
      currency: order.currency_code || constants.CHECKOUT_CONFIG.CURRENCY,
      paymentMethod: paymentMethodLabel,
      amountPaid,
      change,
      footer: "Thank you for your business!",
    };
  }, [store]);

  const getReceiptLabels = useCallback(() => ({
    ...DEFAULT_RECEIPT_LABELS,
    title: t("receipt.title"),
    date: t("receipt.date"),
    time: t("receipt.time"),
    order: t("receipt.order"),
    customer: t("receipt.customer"),
    customerGuest: t("receipt.customer_guest"),
    name: t("receipt.name"),
    email: t("receipt.email"),
    items: t("receipt.items"),
    orderTotals: t("receipt.order_totals"),
    subtotal: t("receipt.subtotal"),
    discount: t("receipt.discount"),
    vat: t("receipt.vat"),
    total: t("receipt.total"),
    paymentMethod: t("receipt.payment_method"),
    amountPaid: t("receipt.amount_paid"),
    change: t("receipt.change"),
    thankYou: t("receipt.thank_you"),
  }), [t]);

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
        const paperWidth = printer.paperWidth ?? "80mm";
        const encoding = (printer as Printer & { encoding?: string }).encoding as import("@/utils/pos/receipt/printer-encoding").PrinterEncoding ?? "ascii";
        const receiptText = buildReceipt(receiptData, paperWidth, getReceiptLabels(), encoding);
        await printReceiptText(receiptText, printer);

        return { success: true, receiptData };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to print receipt";
        console.error("Failed to print receipt:", {
          printer: printer.name,
          detail: errorMessage,
          error,
        });

        throw error;
      }
    },
    [getDefaultPrinter, printReceiptText, buildReceiptDataFromOrder, getReceiptLabels]
  );

  const downloadReceiptAsPDF = useCallback(
    async (order: AdminOrder): Promise<void> => {
      try {
        const receiptData = buildReceiptDataFromOrder(order);
        const defaultPrinter = getDefaultPrinter();
        const pdfBytes = buildReceiptPDF(receiptData, defaultPrinter?.paperWidth ?? "80mm", getReceiptLabels());

        // Generate filename
        const orderId = order.display_id?.toString() || "N/A";
        const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
        const filename = `receipt-${orderId}-${timestamp}.pdf`;

        // Save PDF to Downloads folder
        const fs = await import("@tauri-apps/plugin-fs");
        await fs.writeFile(filename, pdfBytes, {
          baseDir: fs.BaseDirectory.Download,
        });

        toast.success(`Receipt saved as ${filename}`, {
          description: "Saved to your Downloads folder",
          action: {
            label: "Open Folder",
            onClick: () => openDownloadsFolder(filename),
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to download receipt";
        console.error("Failed to download receipt as PDF:", errorMessage, error);
        toast.error("Could not save the receipt PDF", {
          description:
            "Check that your device has free storage space and that saving to Downloads is allowed. If this keeps happening, contact support.",
        });
        throw error;
      }
    },
    [buildReceiptDataFromOrder, getDefaultPrinter, getReceiptLabels]
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
