import type { ReceiptData } from "@/types/utils";

type SaleAtPayment = {
  /** The method being taken, as the receipt names it. */
  paymentMethod: string;
  isCash: boolean;
  /** Cash handed over so far; 0 when nothing is typed yet. */
  cashPaid: number;
  /** What cash must cover: the total, or its rounded amount where cash rounding applies. */
  cashDue: number;
  /** Shown where the order number goes; the real one is assigned when payment completes. */
  orderNumber: string;
};

/**
 * The receipt a sale will print once paid, built from its draft before payment: the
 * draft reads as unpaid, so the payment lines are what the payment screen says they will be.
 */
const receiptAsPaid = (data: ReceiptData, sale: SaleAtPayment): ReceiptData => {
  const cashTyped = sale.isCash && sale.cashPaid > 0;
  return {
    ...data,
    orderDisplayId: sale.orderNumber,
    paymentMethod: sale.paymentMethod,
    isUnpaid: false,
    amountDue: undefined,
    bankDetails: undefined,
    refunded: undefined,
    amountPaid: cashTyped ? sale.cashPaid : sale.isCash ? sale.cashDue : data.total,
    change: cashTyped ? Math.max(0, sale.cashPaid - sale.cashDue) : 0,
    cashRounding: sale.isCash && sale.cashDue !== data.total ? sale.cashDue - data.total : undefined,
  };
};

export { receiptAsPaid };
