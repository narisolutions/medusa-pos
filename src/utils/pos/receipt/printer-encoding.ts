/**
 * Printer character encodings now live in the toolkit; this re-export keeps the
 * import path stable for the settings UI and the printer type.
 *
 * Note: the cp852 "unmapped character" warning is gone. The toolkit's sanitizer
 * still reports them, but `buildReceiptText` sanitizes internally and exposes no
 * hook to forward it to the logger.
 */
export {
  sanitizePrinterString,
  type PrinterEncoding,
} from "@narisolutions/pos-toolkit/receipt-builder";
