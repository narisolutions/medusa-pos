# 2. Domain model

All amounts are in **display units** (e.g. `50.00` = fifty in store currency).

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
type CashMovementType = "drop" | "payin";

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
- `reason` is required for every movement so the audit trail is complete.

## Closed-session history

Closed sessions are appended to a **bounded list** (`closed_register_sessions`). The
append happens **before** a new session is opened, so re-opening can never erase a
recorded over/short. v1 stores the records but does not render a browse UI.
