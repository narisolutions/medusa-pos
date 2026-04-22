import { ReceiptData } from "@/types/utils";
import { jsPDF } from "jspdf";
import { formatDateOnly, formatTimeOnly, formatCurrencyRaw } from "@/utils/settings/preferences";

export type { ReceiptData };

export type PaperWidth = "80mm" | "57mm";

const PAPER_CONFIG: Record<PaperWidth, { lineWidth: number; maxItemTitleLen: number; pdfPageWidth: number; pdfMargin: number }> = {
  "80mm": { lineWidth: 48, maxItemTitleLen: 30, pdfPageWidth: 80, pdfMargin: 5 },
  "57mm": { lineWidth: 32, maxItemTitleLen: 18, pdfPageWidth: 58, pdfMargin: 3 },
};

const buildReceipt = (data: ReceiptData, paperWidth: PaperWidth = "80mm"): string => {
  const { lineWidth, maxItemTitleLen } = PAPER_CONFIG[paperWidth];
  const currentDate = new Date();
  const dateStr = formatDateOnly(currentDate);
  const timeStr = formatTimeOnly(currentDate);

  const padLine = (
    left: string,
    right: string,
    totalWidth: number = lineWidth
  ): string => {
    const padding = totalWidth - left.length - right.length;
    return left + " ".repeat(Math.max(1, padding)) + right;
  };

  const centerText = (text: string, totalWidth: number = lineWidth): string => {
    const padding = Math.floor((totalWidth - text.length) / 2);
    return " ".repeat(Math.max(0, padding)) + text;
  };

  const fmtCurrency = (amount: number): string =>
    formatCurrencyRaw(amount, data.currency);

  /**
   * Sanitizes item title to only contain English alphabet letters and spaces.
   * Removes accents (é -> e), emojis, and other special characters.
   */
  const sanitizeItemTitle = (title: string): string => {
    if (!title) return "";

    // Normalize Unicode characters (decomposes é into e + ́)
    const normalized = title.normalize("NFD");

    // Remove diacritical marks (accents) and keep only ASCII letters, spaces, and numbers
    // This regex keeps: A-Z, a-z, 0-9, spaces, and basic punctuation like hyphens
    const sanitized = normalized
      .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks
      .replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters (emojis, etc.)
      .replace(/[^a-zA-Z0-9\s-]/g, "") // Keep only letters, numbers, spaces, and hyphens
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    return sanitized;
  };

  const separator = "=".repeat(lineWidth);
  const thinSeparator = "-".repeat(lineWidth);

  let receipt = `${centerText(data.companyName)}
  ${centerText(data.storeName)}
  ${centerText(data.storeAddress)}`;

  if (data.storeAddress2) {
    receipt += `\n${centerText(data.storeAddress2)}`;
  }

  if (data.storePhone) {
    receipt += `\n${centerText(`Tel: ${data.storePhone}`)}`;
  }

  receipt += `\n\n${separator}\n${centerText("SALES RECEIPT")}\n${separator}\nDate: ${dateStr}                Time: ${timeStr}`;

  receipt += `\nOrder: #${data.orderDisplayId}`;

  const guestEmail = data.guestEmail;

  if (data.customerName || data.customerEmail) {
    receipt += `\n${thinSeparator}`;
    if (guestEmail && data.customerEmail === guestEmail) {
      receipt += `\nCustomer: Guest`;
    } else {
      receipt += `\nCUSTOMER:`;
      if (data.customerName) {
        receipt += `\nName: ${data.customerName}`;
      }
      if (data.customerEmail) {
        receipt += `\nEmail: ${data.customerEmail}`;
      }
    }
  }

  receipt += `\n\n${thinSeparator}\nITEMS:\n${thinSeparator}`;

  // Add items with quantity
  data.items.forEach((item) => {
    const toNumber = (val: unknown): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return val;
      if (typeof val === "string") return parseFloat(val) || 0;

      // Handle BigNumber-like objects
      if (val && typeof val === "object") {
        // Type guard for objects with toNumber method
        if (
          "toNumber" in val &&
          typeof (val as Record<string, unknown>).toNumber === "function"
        ) {
          return (val as Record<string, () => number>).toNumber();
        }
        // Type guard for objects with valueOf method
        if (
          "valueOf" in val &&
          typeof (val as Record<string, unknown>).valueOf === "function"
        ) {
          return Number((val as Record<string, () => unknown>).valueOf()) || 0;
        }
      }
      return Number(val) || 0;
    };

    const itemTotal =
      item.total !== undefined
        ? toNumber(item.total)
        : toNumber(item.unit_price) * toNumber(item.quantity);

    // Sanitize and truncate item title to fit the paper width
    const sanitizedTitle = sanitizeItemTitle(item.title);
    const itemName =
      sanitizedTitle.length > maxItemTitleLen
        ? sanitizedTitle.substring(0, maxItemTitleLen)
        : sanitizedTitle;

    // Item name and total on first line
    receipt += `\n${padLine(itemName, fmtCurrency(itemTotal))}`;

    // Quantity and unit price on line (indented)
    const qtyLine = `  ${toNumber(item.quantity)} x ${fmtCurrency(toNumber(item.unit_price))}`;
    receipt += `\n${qtyLine}`;

    // Item discount if any
    if (item.discount_total && toNumber(item.discount_total) > 0) {
      receipt += `\n  Discount: -${fmtCurrency(toNumber(item.discount_total))}`;
    }
  });

  receipt += `\n${thinSeparator}`;

  // Helper to convert discount to number
  const toNumber = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") return parseFloat(val) || 0;
    return Number(val) || 0;
  };

  const discountAmount = toNumber(data.discount);
  const hasDiscount = discountAmount > 0;

  // Order Totals section
  receipt += `\nOrder Totals:`;

  // Only show Subtotal and Discount if there is a discount
  if (hasDiscount) {
    // Subtotal before discount is applied (includes VAT and discount amount)
    const subtotalBeforeDiscount = data.subtotal + data.tax + discountAmount;
    receipt += `\n${padLine("Subtotal:", fmtCurrency(subtotalBeforeDiscount))}`;
    receipt += `\n${padLine("Discount:", fmtCurrency(discountAmount))}`;
  }

  receipt += `\n${padLine("VAT:", fmtCurrency(data.tax))}`;
  receipt += `\n${padLine("Total:", fmtCurrency(data.total))}`;

  receipt += `\n\nPayment Method: ${data.paymentMethod}`;

  if (data.amountPaid) {
    receipt += `\n${padLine("Amount Paid:", fmtCurrency(data.amountPaid))}`;
  }

  if (data.change && data.change > 0) {
    receipt += `\n${padLine("Change:", fmtCurrency(data.change))}`;
  }

  receipt += `\n\n${centerText(data.footer || "Thank you for your visit!")}`;
  receipt += `\n\n${separator}\n`;

  return receipt;
};

const buildReceiptPDF = (data: ReceiptData, paperWidth: PaperWidth = "80mm"): Uint8Array => {
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

  // Helper function to convert values to numbers
  const toNumber = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") return parseFloat(val) || 0;
    if (val && typeof val === "object") {
      if ("toNumber" in val && typeof (val as Record<string, unknown>).toNumber === "function") {
        return (val as Record<string, () => number>).toNumber();
      }
      if ("valueOf" in val && typeof (val as Record<string, unknown>).valueOf === "function") {
        return Number((val as Record<string, () => unknown>).valueOf()) || 0;
      }
    }
    return Number(val) || 0;
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
  addText("SALES RECEIPT", "center", 12, true, 5);
  addSeparator("thin", 0, 4);

  // Order Information
  const currentDate = new Date();
  const dateStr = formatDateOnly(currentDate);
  const timeStr = formatTimeOnly(currentDate);
  
  addTwoColumn("Date:", dateStr, false, 5);
  addTwoColumn("Time:", timeStr, false, 5);
  addTwoColumn("Order:", `#${data.orderDisplayId}`, true, 5);

  const guestEmail = data.guestEmail;

  // Customer Information
  if (data.customerName || data.customerEmail) {
    addSpacing(2);
    if (guestEmail && data.customerEmail === guestEmail) {
      addTwoColumn("Customer:", "Guest", false, 5);
    } else {
      addText("CUSTOMER:", "left", 9, true, 4);
      if (data.customerName) {
        addTwoColumn("Name:", data.customerName, false, 5);
      }
      if (data.customerEmail) {
        addTwoColumn("Email:", data.customerEmail, false, 5);
      }
    }
  }

  addSeparator("thin", 3, 4);

  // Items Section
  addText("ITEMS", "left", 10, true, 5);

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
      doc.text(`  Discount: ${discountStr}`, margin + 2, yPosition);
      yPosition += 4;
    }
    
    // Add spacing between items
    addSpacing(1);
  });

  addSeparator("thin", 2, 4);

  // Order Totals Section
  addText("ORDER TOTALS", "left", 10, true, 5);

  const discountAmount = toNumber(data.discount);
  const hasDiscount = discountAmount > 0;

  if (hasDiscount) {
    const subtotalBeforeDiscount = data.subtotal + data.tax + discountAmount;
    addTwoColumn("Subtotal:", formatCurrencyRaw(subtotalBeforeDiscount, data.currency), false, 5);
    addTwoColumn("Discount:", `-${formatCurrencyRaw(discountAmount, data.currency)}`, false, 5);
  }

  addTwoColumn("VAT:", formatCurrencyRaw(data.tax, data.currency), false, 5);
  
  addSeparator("thin", 2, 4);
  addTwoColumn("TOTAL:", formatCurrencyRaw(data.total, data.currency), true, 5);
  addSeparator("thin", 2, 4);

  // Payment Information
  addTwoColumn("Payment Method:", data.paymentMethod, false, 5);

  if (data.amountPaid) {
    addTwoColumn("Amount Paid:", formatCurrencyRaw(data.amountPaid, data.currency), false, 5);
  }

  if (data.change && data.change > 0) {
    addTwoColumn("Change:", formatCurrencyRaw(data.change, data.currency), false, 5);
  }

  // Footer
  addSeparator("thin", 4, 4);
  addText(data.footer || "Thank you for your visit!", "center", 9, false, 5);
  addSpacing(3);
  addSeparator("thick", 0, 0);

  return doc.output("arraybuffer") as unknown as Uint8Array;
};

export { buildReceipt, buildReceiptPDF };
