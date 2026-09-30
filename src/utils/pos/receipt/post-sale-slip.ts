import {
  buildReceiptText,
  type PaperWidth,
  type PaymentRow,
  type PrinterEncoding,
  type ReceiptDoc,
  type ReceiptItem,
} from "@narisolutions/pos-toolkit/receipt-builder";
import { formatCurrencyRaw, formatDateOnly, formatTimeOnly } from "@/utils/settings/preferences";

/** What a return, exchange or added-items operation did, for the customer's paper. */
export type PostSaleSlip = {
  kind: "return" | "exchange" | "add";
  orderDisplayId: string | number;
  currency: string;
  back: { title: string; quantity: number; unitPrice: number; condition: "restock" | "damaged" }[];
  out: { title: string; quantity: number; unitPrice: number }[];
  settlement:
    | { direction: "pays" | "refund"; amount: number; method: string }
    | { direction: "even" };
};

/** A slip waiting for its settlement — the refund that follows a return. */
export type PostSaleSlipDraft = Omit<PostSaleSlip, "settlement">;

export type PostSaleSlipLabels = {
  title: Record<PostSaleSlip["kind"], string>;
  date: string;
  time: string;
  order: string;
  items: string;
  back: string;
  out: string;
  restock: string;
  damaged: string;
  comingBack: string;
  goingOut: string;
  paymentMethod: string;
  customerPaid: string;
  refunded: string;
  even: string;
  footer: string;
};

export function buildPostSaleSlipDoc(
  slip: PostSaleSlip,
  labels: PostSaleSlipLabels,
  headerLines: string[],
  now: Date = new Date()
): ReceiptDoc {
  const back: ReceiptItem[] = slip.back.map((l) => ({
    title: l.title,
    qty: l.quantity,
    unitPrice: l.unitPrice,
    // Negative: it comes off what the customer owes.
    total: -l.unitPrice * l.quantity,
    sublines: [{ text: `${labels.back} - ${l.condition === "restock" ? labels.restock : labels.damaged}` }],
  }));
  const out: ReceiptItem[] = slip.out.map((l) => ({
    title: l.title,
    qty: l.quantity,
    unitPrice: l.unitPrice,
    total: l.unitPrice * l.quantity,
    sublines: [{ text: labels.out }],
  }));

  const comingBack = slip.back.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const goingOut = slip.out.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const paymentRows: PaymentRow[] =
    slip.settlement.direction === "even"
      ? []
      : [
          { label: labels.paymentMethod, value: slip.settlement.method },
          {
            label: slip.settlement.direction === "pays" ? labels.customerPaid : labels.refunded,
            amount: slip.settlement.amount,
          },
        ];

  return {
    headerLines,
    title: labels.title[slip.kind],
    metaRows: [
      { label: labels.date, value: formatDateOnly(now) },
      { label: labels.time, value: formatTimeOnly(now) },
      { label: labels.order, value: `#${slip.orderDisplayId}` },
    ],
    itemsHeading: labels.items,
    items: [...back, ...out],
    totalRows: [
      ...(comingBack > 0 ? [{ label: labels.comingBack, amount: -comingBack }] : []),
      ...(goingOut > 0 ? [{ label: labels.goingOut, amount: goingOut }] : []),
    ],
    paymentRows,
    messages: slip.settlement.direction === "even" ? [labels.even] : [],
    footerLines: [labels.footer],
  };
}

export function buildPostSaleSlipText(
  slip: PostSaleSlip,
  options: {
    labels: PostSaleSlipLabels;
    headerLines: string[];
    paperWidth?: PaperWidth;
    encoding?: PrinterEncoding;
  }
): string {
  return buildReceiptText(buildPostSaleSlipDoc(slip, options.labels, options.headerLines), {
    formatAmount: (amount) => formatCurrencyRaw(amount, slip.currency),
    paperWidth: options.paperWidth ?? "80mm",
    encoding: options.encoding ?? "translit",
  });
}
