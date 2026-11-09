export type RegisterSessionStatus = "open" | "closed";

export type CashMovementType = "drop" | "payin" | "no_sale";

/**
 * A mid-shift adjustment to the expected drawer total.
 * `amount` is always positive (display units); `type` decides the sign:
 * "drop" subtracts (cash removed), "payin" adds (cash added).
 * "no_sale" is the drawer opened without a sale: amount 0, counted only.
 */
export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  at: string; // ISO timestamp
};

/**
 * The single source of truth for one register shift. Amounts are in display
 * units (50.00 = fifty in store currency). Closed sessions snapshot
 * `expectedCash` so the recorded `difference` is immutable.
 */
export type RegisterSession = {
  id: string;
  status: RegisterSessionStatus;
  openedAt: string; // ISO timestamp
  openingFloat: number;
  movements: CashMovement[];

  // Set only when the session is closed:
  closedAt?: string; // ISO timestamp
  countedCash?: number; // single counted total
  expectedCash?: number; // snapshot at close
  difference?: number; // countedCash - expectedCash (+over / -short)
  note?: string; // required when |difference| > threshold
  fiscalZRef?: string; // the cash register's own Z number, when the till uses one
  report?: SessionReport; // the Z, frozen at close; absent on closes made before it existed
  zPrintedAt?: string; // ISO timestamp of the Z's first paper print; later prints say REPRINT

  /** The same-day session this one follows, when it was opened by Reopen. */
  reopenedFrom?: string;

  // Legacy: a close undone by a reopen that resumed the session (before new-session reopen).
  voided?: boolean;
  voidedAt?: string; // ISO timestamp of the reopen that voided it
};

export type CountSum = { count: number; amount: number };

export type ReportTender = "cash" | "card" | "bank_transfer" | "transfer";

/** The figures an X shows live and a Z freezes at close. Display units. */
export type SessionReport = {
  cash: {
    openingFloat: number;
    cashSales: number;
    cashRefunds: number;
    payins: number;
    drops: number;
    expected: number;
  };
  /** Payments captured on the session's orders, before refunds. */
  tenders: Record<ReportTender, CountSum>;
  /** Pay-later orders with nothing captured yet. */
  unpaid: CountSum;
  refunds: { cash: CountSum; other: CountSum };
  movements: { payins: CountSum; drops: CountSum; noSales: number };
  sales: number;
  cancelled: number;
};
