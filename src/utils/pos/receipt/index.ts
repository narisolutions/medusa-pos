import { ReceiptData } from "@/types/utils";
import { toNumber } from "@/utils/pos/pricing";
import { formatDateOnly, formatTimeOnly, formatCurrencyRaw } from "@/utils/settings/preferences";
import {
  buildReceiptText,
  type MoneyRow,
  type PaperWidth,
  type ReceiptDoc,
  type ReceiptItem,
} from "@narisolutions/pos-toolkit/receipt-builder";
import { type PrinterEncoding } from "./printer-encoding";

export type { ReceiptData };
export type { PrinterEncoding };
export type { PaperWidth };

export type ReceiptLabels = {
  title: string;
  date: string;
  time: string;
  order: string;
  customer: string;
  customerGuest: string;
  name: string;
  email: string;
  items: string;
  orderTotals: string;
  subtotal: string;
  discount: string;
  vat: string;
  total: string;
  rounding: string;
  paymentMethod: string;
  amountPaid: string;
  change: string;
  amountDue: string;
  unpaid: string;
  thankYou: string;
};

export const DEFAULT_RECEIPT_LABELS: ReceiptLabels = {
  title: "SALES RECEIPT",
  date: "Date",
  time: "Time",
  order: "Order",
  customer: "CUSTOMER",
  customerGuest: "Guest",
  name: "Name",
  email: "Email",
  items: "ITEMS",
  orderTotals: "Order Totals",
  subtotal: "Subtotal",
  discount: "Discount",
  vat: "VAT",
  total: "Total",
  rounding: "Rounding",
  paymentMethod: "Payment Method",
  amountPaid: "Amount Paid",
  change: "Change",
  amountDue: "Amount Due",
  unpaid: "** UNPAID — PAYMENT PENDING **",
  thankYou: "Thank you for your visit!",
};

// Text layout widths come from the toolkit; only the PDF sizing is local.
const PAPER_CONFIG: Record<PaperWidth, { maxItemTitleLen: number; pdfPageWidth: number; pdfMargin: number }> = {
  "80mm": { maxItemTitleLen: 30, pdfPageWidth: 80, pdfMargin: 5 },
  "57mm": { maxItemTitleLen: 18, pdfPageWidth: 58, pdfMargin: 3 },
};

/**
 * Medusa order data → a paper-agnostic receipt document. All the POS-specific
 * math (metadata discounts, cash rounding, pay-later) has already happened in
 * `buildReceiptDataFromOrder`; this only decides which lines exist.
 */
const buildReceiptDoc = (
  data: ReceiptData,
  labels: ReceiptLabels = DEFAULT_RECEIPT_LABELS
): ReceiptDoc => {
  const fmtCurrency = (amount: number): string =>
    formatCurrencyRaw(amount, data.currency);

  const currentDate = new Date();

  const headerLines = [
    data.companyName,
    data.storeName,
    data.storeAddress,
    data.storeAddress2,
    data.storePhone ? `Tel: ${data.storePhone}` : undefined,
  ].filter((line): line is string => Boolean(line));

  const metaRows = [
    { label: labels.date, value: formatDateOnly(currentDate) },
    { label: labels.time, value: formatTimeOnly(currentDate) },
    { label: labels.order, value: `#${data.orderDisplayId}` },
  ];

  if (data.customerName || data.customerEmail) {
    if (data.guestEmail && data.customerEmail === data.guestEmail) {
      metaRows.push({ label: labels.customer, value: labels.customerGuest });
    } else {
      if (data.customerName) {
        metaRows.push({ label: labels.name, value: data.customerName });
      }
      if (data.customerEmail) {
        metaRows.push({ label: labels.email, value: data.customerEmail });
      }
    }
  }

  // The payment method is a label, not an amount, so it cannot sit in the
  // payment block with Amount Paid / Change the way it used to.
  metaRows.push({ label: labels.paymentMethod, value: data.paymentMethod });

  const items: ReceiptItem[] = data.items.map((item) => {
    const discount = toNumber(item.discount_total);
    return {
      title: item.title,
      qty: toNumber(item.quantity),
      unitPrice: toNumber(item.unit_price),
      total:
        item.total !== undefined
          ? toNumber(item.total)
          : toNumber(item.unit_price) * toNumber(item.quantity),
      sublines:
        discount > 0
          ? [{ text: `${labels.discount}: -${fmtCurrency(discount)}` }]
          : undefined,
    };
  });

  const discountAmount = toNumber(data.discount);
  const totalRows: MoneyRow[] = [];

  // Subtotal only means something next to a discount line.
  if (discountAmount > 0) {
    totalRows.push({
      label: labels.subtotal,
      amount: data.subtotal + data.tax + discountAmount,
    });
    totalRows.push({ label: labels.discount, amount: discountAmount });
  }

  totalRows.push({ label: labels.vat, amount: data.tax });
  totalRows.push({ label: labels.total, amount: data.total });
  if (data.cashRounding) {
    totalRows.push({ label: labels.rounding, amount: data.cashRounding });
  }

  const paymentRows: MoneyRow[] = [];
  const messages: string[] = [];

  if (data.isUnpaid) {
    paymentRows.push({
      label: labels.amountDue,
      amount: data.amountDue ?? data.total,
    });
    messages.push(labels.unpaid);
  } else {
    if (data.amountPaid) {
      paymentRows.push({ label: labels.amountPaid, amount: data.amountPaid });
    }
    if (data.change && data.change > 0) {
      paymentRows.push({ label: labels.change, amount: data.change });
    }
  }

  return {
    headerLines,
    title: labels.title,
    metaRows,
    itemsHeading: labels.items,
    items,
    totalRows,
    paymentRows,
    messages,
    footerLines: [data.footer || labels.thankYou],
  };
};

const buildReceipt = (
  data: ReceiptData,
  paperWidth: PaperWidth = "80mm",
  labels: ReceiptLabels = DEFAULT_RECEIPT_LABELS,
  encoding: PrinterEncoding = "ascii"
): string =>
  buildReceiptText(buildReceiptDoc(data, labels), {
    formatAmount: (amount) => formatCurrencyRaw(amount, data.currency),
    paperWidth,
    encoding,
  });

const buildReceiptPDF = async (data: ReceiptData, paperWidth: PaperWidth = "80mm", labels: ReceiptLabels = DEFAULT_RECEIPT_LABELS): Promise<Uint8Array> => {
  // jsPDF is heavy — load it only when a PDF is actually exported.
  const { jsPDF } = await import("jspdf");
  const { pdfPageWidth, pdfMargin, maxItemTitleLen } = PAPER_CONFIG[paperWidth];
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pdfPageWidth, 200],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = pdfMargin;
  let yPosition = 8;

  // Helper to add text with alignment
  const addText = (
    text: string,
    align: "left" | "center" | "right" = "left",
    fontSize: number = 10,
    isBold: boolean = false,
    lineSpacing: number = 4
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    
    const xPosition = align === "center" 
      ? pageWidth / 2 
      : align === "right" 
      ? pageWidth - margin 
      : margin;
    
    doc.text(text, xPosition, yPosition, { align });
    yPosition += lineSpacing;
  };

  // Helper to add separator line
  const addSeparator = (style: "thick" | "thin" = "thin", spacingBefore: number = 2, spacingAfter: number = 3) => {
    yPosition += spacingBefore;
    const lineWidth = style === "thick" ? 0.3 : 0.1;
    doc.setLineWidth(lineWidth);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += spacingAfter;
  };

  // Helper to add two-column text (label and value)
  const addTwoColumn = (label: string, value: string, labelBold: boolean = false, lineSpacing: number = 4.5) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", labelBold ? "bold" : "normal");
    doc.text(label, margin, yPosition);
    
    doc.setFont("helvetica", "normal");
    doc.text(value, pageWidth - margin, yPosition, { align: "right" });
    yPosition += lineSpacing;
  };

  // Helper to add spacing
  const addSpacing = (spacing: number) => {
    yPosition += spacing;
  };

  // Header Section
  addText(data.companyName, "center", 13, true, 5);
  addText(data.storeName, "center", 11, true, 4);
  addText(data.storeAddress, "center", 9, false, 4);
  if (data.storeAddress2) {
    addText(data.storeAddress2, "center", 9, false, 4);
  }
  if (data.storePhone) {
    addText(`Tel: ${data.storePhone}`, "center", 9, false, 5);
  }

  addSeparator("thick", 2, 4);
  
  // Receipt Title
  addText(labels.title, "center", 12, true, 5);
  addSeparator("thin", 0, 4);

  // Order Information
  const currentDate = new Date();
  const dateStr = formatDateOnly(currentDate);
  const timeStr = formatTimeOnly(currentDate);
  
  addTwoColumn(labels.date + ":", dateStr, false, 5);
  addTwoColumn(labels.time + ":", timeStr, false, 5);
  addTwoColumn(labels.order + ":", `#${data.orderDisplayId}`, true, 5);

  const guestEmail = data.guestEmail;

  // Customer Information
  if (data.customerName || data.customerEmail) {
    addSpacing(2);
    if (guestEmail && data.customerEmail === guestEmail) {
      addTwoColumn(labels.customer + ":", labels.customerGuest, false, 5);
    } else {
      addText(labels.customer + ":", "left", 9, true, 4);
      if (data.customerName) {
        addTwoColumn(labels.name + ":", data.customerName, false, 5);
      }
      if (data.customerEmail) {
        addTwoColumn(labels.email + ":", data.customerEmail, false, 5);
      }
    }
  }

  addSeparator("thin", 3, 4);

  // Items Section
  addText(labels.items, "left", 10, true, 5);

  data.items.forEach((item) => {
    const itemTotal = item.total !== undefined
      ? toNumber(item.total)
      : toNumber(item.unit_price) * toNumber(item.quantity);

    const itemTitle = String(item.title || "").substring(0, Math.max(10, maxItemTitleLen - 7));
    const totalStr = formatCurrencyRaw(itemTotal, data.currency);
    
    // Item name and total
    addTwoColumn(itemTitle, totalStr, true, 4);
    
    // Quantity and unit price
    const qtyPrice = `${toNumber(item.quantity)} × ${formatCurrencyRaw(toNumber(item.unit_price), data.currency)}`;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`  ${qtyPrice}`, margin + 2, yPosition);
    yPosition += 4;

    // Item discount if any
    if (item.discount_total && toNumber(item.discount_total) > 0) {
      const discountStr = `-${formatCurrencyRaw(toNumber(item.discount_total), data.currency)}`;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(`  ${labels.discount}: ${discountStr}`, margin + 2, yPosition);
      yPosition += 4;
    }
    
    // Add spacing between items
    addSpacing(1);
  });

  addSeparator("thin", 2, 4);

  // Order Totals Section
  addText(labels.orderTotals.toUpperCase(), "left", 10, true, 5);

  const discountAmount = toNumber(data.discount);
  const hasDiscount = discountAmount > 0;

  if (hasDiscount) {
    const subtotalBeforeDiscount = data.subtotal + data.tax + discountAmount;
    addTwoColumn(labels.subtotal + ":", formatCurrencyRaw(subtotalBeforeDiscount, data.currency), false, 5);
    addTwoColumn(labels.discount + ":", `-${formatCurrencyRaw(discountAmount, data.currency)}`, false, 5);
  }

  addTwoColumn(labels.vat + ":", formatCurrencyRaw(data.tax, data.currency), false, 5);
  
  addSeparator("thin", 2, 4);
  addTwoColumn(labels.total.toUpperCase() + ":", formatCurrencyRaw(data.total, data.currency), true, 5);
  if (data.cashRounding) {
    addTwoColumn(labels.rounding + ":", formatCurrencyRaw(data.cashRounding, data.currency), false, 5);
  }
  addSeparator("thin", 2, 4);

  // Payment Information
  addTwoColumn(labels.paymentMethod + ":", data.paymentMethod, false, 5);

  if (data.isUnpaid) {
    addTwoColumn(labels.amountDue + ":", formatCurrencyRaw(data.amountDue ?? data.total, data.currency), true, 5);
    addSpacing(2);
    addText(labels.unpaid, "center", 10, true, 5);
  } else {
    if (data.amountPaid) {
      addTwoColumn(labels.amountPaid + ":", formatCurrencyRaw(data.amountPaid, data.currency), false, 5);
    }

    if (data.change && data.change > 0) {
      addTwoColumn(labels.change + ":", formatCurrencyRaw(data.change, data.currency), false, 5);
    }
  }

  // Footer
  addSeparator("thin", 4, 4);
  addText(data.footer || labels.thankYou, "center", 9, false, 5);
  addSpacing(3);
  addSeparator("thick", 0, 0);

  return new Uint8Array(doc.output("arraybuffer"));
};

export { buildReceipt, buildReceiptPDF };
