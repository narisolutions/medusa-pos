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
- **Two-step (normal close)**: after the count is validated, a **confirm step** restates
  Expected / Counted / Over-Short and warns that closing **ends the business day and
  blocks selling until the register is reopened**. The forced prior-day reconcile skips
  this step (it is mandatory).
- **On confirm**: snapshots `expectedCash`, writes `countedCash`, `difference`, `note`,
  `closedAt`; archives the session to history; optionally prints a close summary.
- **After close**: the register is closed, so checkout is **blocked** (the open-modal gate
  keys off `isOpen`, not just "needs a new day"). No post-close sale can go untracked.

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

## Register sidebar item

The register lives as an item in the sidebar rail (`RegisterMenuItem`), with a status dot:

- **Hidden entirely when the feature is disabled** (the rail looks unchanged).
- **Open (green dot)**: tapping opens a touch-friendly action chooser — **Cash drop /
  pay-in** or **Close register**.
- **Closed earlier today (amber dot, "Reopen")**: tapping opens the **Reopen** dialog
  (manager PIN when `requirePinToClose` is on). See the Reopen flow below.
- **Otherwise (inert)**: disabled; opening for a new business day is driven by the
  blocking open dialog, not this item.

## Reopen (undo a same-day close)

- **When**: a session was closed earlier on the **current** business day (`canReopen`).
  A session closed on a previous day is finished — the next-day open flow owns it.
- **Why**: recover from an accidental / premature mid-shift close without losing data.
- **Behavior**: resumes the **same** session (same `id`, `openingFloat`, `movements`),
  so orders stamped during the shift stay attributed and expected cash continues
  seamlessly — no re-entered float, no split day.
- **Audit**: the archived close is **not** deleted; it is flagged `voided` (with
  `voidedAt`) so the over/short stays on record. A later legitimate close appends a new
  archive entry alongside it.
- **Authority**: gated by the manager PIN whenever `requirePinToClose` is on (reopen is a
  manager-level undo, same authority as closing).

> Placement is a host-app choice; the register components are self-contained. See
> [Portability](./09-portability.md).
