import { AdminOrder } from "@medusajs/types";
import {
  buildReceiptText,
  type PaperWidth,
  type PrinterEncoding,
  type ReceiptDoc,
} from "@narisolutions/pos-toolkit/receipt-builder";
import { toNumber } from "@/utils/pos/pricing";
import { formatCurrencyRaw, formatDateOnly, formatTimeOnly } from "@/utils/settings/preferences";
import { getOrderCurrency } from "@/utils/helpers";

export type HandoffTicketLabels = {
  title: string;
  banner: string;
  date: string;
  time: string;
  order: string;
  counterparty: string;
  items: string;
  total: string;
  footer: string;
};

export type HandoffTicketOptions = {
  labels: HandoffTicketLabels;
  headerLines: string[];
  counterpartyName?: string;
  paperWidth?: PaperWidth;
  encoding?: PrinterEncoding;
};

/**
 * The part of the ticket a person reads. Staff must be able to act on the paper
 * without scanning it, so this carries the same items the QR does.
 */
export function buildHandoffTicketText(
  order: AdminOrder,
  options: HandoffTicketOptions
): string {
  const { labels, headerLines, counterpartyName } = options;
  const currency = getOrderCurrency(order);
  const now = new Date();

  const metaRows = [
    { label: labels.date, value: formatDateOnly(now) },
    { label: labels.time, value: formatTimeOnly(now) },
    { label: labels.order, value: `#${order.display_id ?? "N/A"}` },
  ];

  if (counterpartyName) {
    metaRows.push({ label: labels.counterparty, value: counterpartyName });
  }

  const items = (order.items ?? []).map((item) => ({
    title: item.title ?? "",
    qty: toNumber(item.quantity),
    unitPrice: toNumber(item.unit_price),
    total: toNumber(item.unit_price) * toNumber(item.quantity),
  }));

  const ticketTotal = items.reduce((sum, item) => sum + item.total, 0);

  const doc: ReceiptDoc = {
    headerLines,
    title: labels.title,
    metaRows,
    itemsHeading: labels.items,
    items,
    totalRows: [{ label: labels.total, amount: ticketTotal }],
    // The banner is the whole point of the paper: nobody takes money for this.
    messages: [labels.banner],
    footerLines: [labels.footer],
  };

  return buildReceiptText(doc, {
    formatAmount: (amount) => formatCurrencyRaw(amount, currency),
    paperWidth: options.paperWidth ?? "80mm",
    encoding: options.encoding ?? "translit",
  });
}
