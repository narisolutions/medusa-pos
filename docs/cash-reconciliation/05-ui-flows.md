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

## No-sale

- **When**: the cart's *Cash drawer* button, while a register session is open.
- **Fields**: reason (required). The `no_sale` movement is logged first, then the drawer opens.
- **Otherwise** the button stays disabled, as it was before the X/Z: the drawer never opens
  without a sale unless it is on record.

## X report

- **When**: *X report* in the register chooser, while a session is open.
- **Shows**: a preview of the live report, then **Print** and **PDF**. Changes nothing.
  See [X and Z reports](./10-x-and-z-reports.md).

## Close register dialog

- **When**: invoked from the register status while a session is open.
- **Shows**: `Expected` (live) and computes `Over/Short` once a counted total is entered.
- **Fields**:
  - counted cash (single total, required).
  - reason — **required only** when `|counted − expected|` exceeds the threshold.
- **Two-step (normal close)**: after the count is validated, a **confirm step** restates
  Expected / Counted / Over-Short and warns that closing **ends the business day and
  blocks selling until the register is reopened**. The forced prior-day reconcile skips
  this step (it is mandatory).
- **On confirm**: snapshots `expectedCash`, writes `countedCash`, `difference`, `note`,
  `closedAt`; archives the session to history; optionally prints a close summary.
- **Guided close**: count → reconcile (over/short before commit, recount) →
  **cash register Z number** (on the count screen, required, only when the till uses a
  cash register) → confirm (double tap guarded) → print the
  **Z (NON-FISCAL)**, frozen into the session as its `report`. See
  [X and Z reports](./10-x-and-z-reports.md#the-guided-close).
- **After close**: the register is closed, so checkout is **blocked** (the open-modal gate
  keys off `isOpen`, not just "needs a new day"). No post-close sale can go untracked.

### Close summary (optional print)

Before the X/Z this was a short text block; the Z
([paper layout](./10-x-and-z-reports.md#paper-layout)) replaces it:

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
- **Closed earlier today (amber dot, "Reopen")**: tapping opens the **Reopen** dialog.
  See the Reopen flow below.
- **Otherwise (inert)**: disabled; opening for a new business day is driven by the
  blocking open dialog, not this item.
- The chooser gains *X report* (open) and *History* (every state), so the
  item is never inert while enabled; the closed-today state opens a chooser (*Reopen* ·
  *History*) instead of the Reopen dialog directly. See [Session book](./11-session-book.md#where).

## Session book

Register → History: closed sessions newest first; a row opens its Z with **Print** and
**PDF**, rendered from stored figures. See [Session book](./11-session-book.md).

## Reopen (a second session on the same day)

- **When**: a session was closed earlier on the **current** business day (`canReopen`).
  A session closed on a previous day is finished — the next-day open flow owns it.
- **Why**: keep selling after an accidental / premature mid-shift close.
- **Behavior** (since 2026-10-28): starts a **new** session. Its float is the previous
  session's **counted** cash, carried over without re-entry, and it records the session
  it follows (`reopenedFrom`). A closed session is never resumed: its Z — and, with a
  cash register, the device's Z — is already out.
- **Audit**: the first close stays as it was, a valid Z. Orders are stamped with their
  own session's id, so neither session counts the other's cash.
- **Before 2026-10-28** a reopen resumed the same session and flagged its archived close
  `voided` (with `voidedAt`). Those records stay in history as they are.
- **Authority**: **ungated on the device.** Reopen is a manager-level undo and belongs
  behind a staff role, but roles are server-side work that does not exist yet, so any
  operator can do it. What protects the number is the audit trail rather than the gate:
  the first close and its Z stay on record.

> Placement is a host-app choice; the register components are self-contained. See
> [Portability](./09-portability.md).
