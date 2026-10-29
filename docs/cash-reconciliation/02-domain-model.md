# 2. Domain model

All amounts are stored in **display units** (e.g. `50.00` = fifty in store currency), and
summed in integer **minor units** (`toMinorUnits` / `fromMinorUnits` in `utils/pos/pricing`), so float
drift never turns a balanced drawer into a 0.00 over/short.

## `RegisterSession`

The single source of truth for one shift.

```ts
type RegisterSessionStatus = "open" | "closed";

type RegisterSession = {
  id: string;              // unique session id (e.g. timestamp + random)
  status: RegisterSessionStatus;
  openedAt: string;        // ISO timestamp the register was opened
  openingFloat: number;    // starting cash entered at open
  movements: CashMovement[]; // drops & pay-ins during the shift

  // Set only when the session is closed:
  closedAt?: string;       // ISO timestamp
  countedCash?: number;    // single counted total entered at close
  expectedCash?: number;   // snapshot of expected cash at the moment of close
  difference?: number;     // countedCash - expectedCash  (+over / -short)
  note?: string;           // required when |difference| > threshold
  fiscalZRef?: string;     // the cash register's Z number, digits only (when the till uses one)
  report?: SessionReport;  // the frozen Z (see below)
  zPrintedAt?: string;     // first paper print of the Z; later prints say REPRINT

  reopenedFrom?: string;   // the same-day session this one follows, when opened by Reopen

  // Legacy (before 2026-10-28): a close undone by a reopen that resumed the session.
  voided?: boolean;
  voidedAt?: string;       // ISO timestamp of the reopen
};
```

### Field semantics

- **`openedAt`** drives the business-day comparison (see
  [Business day](./03-business-day-and-expected-cash.md)) and the lower bound of the
  "orders during this session" query.
- **`expectedCash`** is **snapshotted at close** so the recorded difference is
  immutable. Re-deriving it later (orders could change) would let a discrepancy be
  silently rewritten — never recompute a closed session's numbers.
- **`difference`** uses the sign convention **counted − expected**: positive = drawer is
  **over**, negative = **short**.
- **`note`** is mandatory only when `|difference|` exceeds the configured threshold.

## `CashMovement`

A mid-shift adjustment to the expected drawer total.

```ts
type CashMovementType = "drop" | "payin" | "no_sale";

type CashMovement = {
  id: string;
  type: CashMovementType;  // "drop" = cash removed; "payin" = cash added
  amount: number;          // always positive; the type decides the sign
  reason: string;          // required — audit trail
  at: string;              // ISO timestamp
};
```

- A **drop** (`type: "drop"`) removes cash from the drawer (e.g. moved to a safe) →
  **subtracts** from expected.
- A **pay-in** (`type: "payin"`) adds cash to the drawer (e.g. change top-up) →
  **adds** to expected.
- `amount` is stored as a positive number; the **type** determines direction. This keeps
  the data unambiguous and the math centralized in one place.
- A **no-sale** (`type: "no_sale"`) records the drawer opened without a
  sale. `amount` is `0`; it changes no figure and is only counted
  ([X and Z reports](./10-x-and-z-reports.md#no-sale)).
- `reason` is required for every movement so the audit trail is complete.

## Closed-session history

Closed sessions are appended to a **bounded list** (`closed_register_sessions`). The
append happens **before** a new session is opened, so re-opening can never erase a
recorded over/short. v1 stores the records but does not render a browse UI; the
[session book](./11-session-book.md) is that UI.

## Report snapshot

The Z's figures, written into the session at close next to
`expectedCash` and, like it, never recomputed. A close made before this existed has no
`report`.

```ts
type CountSum = { count: number; amount: number };

type SessionReport = {
  cash: {
    openingFloat: number;
    cashSales: number;      // what stayed in the drawer (rounded where rounding is on)
    cashRefunds: number;
    payins: number;
    drops: number;
    expected: number;       // equals expectedCash
  };
  tenders: Record<"cash" | "card" | "bank_transfer" | "transfer", CountSum>; // captured, before refunds
  unpaid: CountSum;        // pay-later orders with nothing captured yet
  refunds: { cash: CountSum; other: CountSum };
  movements: { payins: CountSum; drops: CountSum; noSales: number };
  sales: number;            // non-cancelled orders
  cancelled: number;
};
```

Counted, over/short, reason and fiscal reference are not repeated inside `report`: they
are the session's own close fields. All four tender keys are always present (zeros
print).
