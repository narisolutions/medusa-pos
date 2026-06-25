export type RegisterSessionStatus = "open" | "closed";

export type CashMovementType = "drop" | "payin";

/**
 * A mid-shift adjustment to the expected drawer total.
 * `amount` is always positive (display units); `type` decides the sign:
 * "drop" subtracts (cash removed), "payin" adds (cash added).
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

  // Set on an archived close that was later undone via Reopen. The record is kept
  // (not deleted) so the over/short stays auditable.
  voided?: boolean;
  voidedAt?: string; // ISO timestamp of the reopen that voided it
};
