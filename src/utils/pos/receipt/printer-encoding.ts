/**
 * Printer character encodings now live in the toolkit; this re-export keeps the
 * import path stable for the settings UI and the printer type.
 */
export {
  sanitizePrinterString,
  type PrinterEncoding,
} from "@narisolutions/pos-toolkit/receipt-builder";
