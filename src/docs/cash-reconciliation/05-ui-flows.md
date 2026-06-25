# 5. UI flows

All dialogs use the app's standard form stack (React Hook Form + Zod). Inputs that take
money use the numeric keypad pattern already used at checkout.

## Open register dialog

- **When**: blocking, at app start, when `needsOpenRegister` is true (and the feature is
  enabled).
- **Fields**: opening float (single amount, required, ≥ 0).
- **Behavior**: cannot be dismissed without opening; checkout stays gated behind it.
- **Stale day**: if a prior day's session is still open, the dialog first routes the
  cashier to **close** that old session (reconcile) before opening today's.

## Cash movement dialog (drops / pay-ins)

- **When**: invoked from the register status while a session is open.
- **Fields**: type (`drop` | `payin`), amount (> 0), reason (required).
- **Effect**: appends a `CashMovement`; expected cash updates immediately.

## Close register dialog

- **When**: invoked from the register status while a session is open.
- **Shows**: `Expected` (live) and computes `Over/Short` once a counted total is entered.
- **Fields**:
  - counted cash (single total, required).
  - reason — **required only** when `|counted − expected|` exceeds the threshold.
  - manager PIN — required when `requirePinToClose` is on.
- **On confirm**: snapshots `expectedCash`, writes `countedCash`, `difference`, `note`,
  `closedAt`; archives the session to history; optionally prints a close summary.

### Close summary (optional print)

A short receipt-printer text block, not a Z-Report:

```
REGISTER CLOSE
Opened:   2026-06-19 09:00
Closed:   2026-06-19 18:30
Float:        50.00
Cash sales:  420.00
Pay-ins:      10.00
Drops:      -100.00
Expected:    380.00
Counted:     378.00
Over/Short:   -2.00  (SHORT)
Reason: miscount on change
```

## Register status (checkout bar)

- A slim horizontal bar at the top of the checkout screen (above the product filter),
  where it is most relevant during sales.
- **Hidden entirely when the feature is disabled** (checkout looks unchanged).
- When open: shows a status dot, "Register open", the live expected total, and exposes
  **Cash drop / pay-in** and **Close register**.
- When closed (already reconciled for the day): shows "Register closed". A new business
  day surfaces the blocking open dialog rather than an inline prompt.

> Placement is a host-app choice; the status component is self-contained and could
> equally live in a global header. See [Portability](./09-portability.md).
