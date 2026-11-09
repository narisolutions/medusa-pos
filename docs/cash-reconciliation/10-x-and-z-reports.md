# 10. X and Z reports

The till's own statement of a register session: what came in, by which tender, and how
the drawer reconciled. It is **non-fiscal**. A certified fiscal device, where the law
requires one, issues the legal document; the till records that document's number.

> **Status:** phase 1 built on `feat/x-z-reports`, not yet released. Phase 1 is till-only; phase 2 moves sessions and totals
> to the backend (see [Portability](./09-portability.md#phase-2-sessions-on-the-backend)).

## Terms

| Term | Meaning |
|---|---|
| **Session** | One drawer's custody period, from open (float) to close (count). The unit both reports cover. |
| **Business day** | The reporting date, shifted by the cut-off hour ([Business day](./03-business-day-and-expected-cash.md)). A session belongs to the business day it opened on. |
| **X report** | A **live readout** of the open session. Read-only: printing one changes nothing, resets nothing, and can be done any number of times. |
| **Z report** | The session's **closing statement**, produced once by the close and **frozen** with it. Every later print is a reprint of the stored figures. Printed as "Z (NON-FISCAL)". |
| **Fiscal Z** | The end-of-day report of a certified fiscal device (cash register or fiscal card terminal). A legal document the till does not produce; it stores only its reference. |
| **No-sale** | Opening the cash drawer without a sale. Logged, with a reason. |

## X vs Z

| | X report | Z report |
|---|---|---|
| When | Any time while the session is open | Once, at close |
| Figures | Live, recomputed from the session's orders | Frozen into the closed session |
| Counted / over-short | No (nothing counted yet) | Yes |
| Fiscal Z reference | No | Yes, when the till uses a cash register |
| Effect | None | Ends the session |
| Output | Preview, then Print or PDF | Printed at close; Print or PDF from the [session book](./11-session-book.md) |

Both are **preview-first**: the screen shows the report as it will print, and Print / PDF
act on what is shown.

## The figures

Both reports carry the same blocks; the Z adds the close block. **Zeros print** — a
tender or counter with nothing in it is shown as `0`, never omitted, so a missing line
always means a missing feature, not an empty one.

### 1. Header

Store name, till (device) name, session id, business day, opened at, closed at (Z) or
"as of" time (X), and the report title (`X REPORT` or `Z (NON-FISCAL)`).

### 2. Cash block — the drawer

```
float
+ cash sales        (net of change: what stayed in the drawer)
- cash refunds
+ pay-ins
- drops
= expected cash
```

This is the existing [expected-cash formula](./03-business-day-and-expected-cash.md),
shown line by line. Cash sales and cash refunds are split (today one net figure); the sum
is unchanged. Cash in a cash-rounding market uses the rounded amount stamped at checkout,
exactly as expected cash does.

### 3. Tenders — payments per method

One line per payment-method **type**, in a fixed order, each with a **count** and a
**sum** of the payments captured on the session's orders:

| Type | Moves the drawer? |
|---|---|
| Cash | Yes |
| Card | No |
| Bank transfer | No |
| Internal transfer | No — settles against a counterparty, no money is taken |

- A split payment counts once in **each** tender it used, with that tender's part.
- Sums are payments **as captured, before refunds** (refunds have their own block). The
  cash line can differ from *cash sales* in the cash block only by cash rounding: the
  tender line is the captured amount, the cash block the rounded amount that hit the
  drawer.
- A **pay-later** order with nothing captured yet (typically one awaiting a bank transfer)
  is in no tender line. It is shown as its own counter: *Unpaid — count, sum* of order
  totals.
- Tenders are counted on the session's **own orders**. A payment taken later on an order
  from an earlier session shows on neither (its cash is a pay-in, as post-sale cash is).
- A total line sums all tenders.

### 4. Refunds

Count and sum of refunds on the session's orders, split cash / non-cash. A refund on an
order from an **earlier** session does not appear here: its cash is already recorded as a
drop by the post-sale flow (see the drop list), and its non-cash part never touched this
session.

### 5. Movements

- Pay-ins: count, sum.
- Drops: count, sum.
- No-sales: count.

The X lists each movement (time, type, amount, reason); the Z lists them too, because the
paper is the record a manager signs.

### 6. Counters

- Sales: number of non-cancelled orders in the session.
- Cancelled: number of cancelled orders in the session.

### 7. Close block (Z only)

- Counted cash.
- Over/short, with the word `OVER`, `SHORT` or `BALANCED` — not the sign alone.
- The reason, when one was given.
- Fiscal Z reference, when the till uses a cash register.
- `VOIDED <time>` on a legacy close undone by a reopen (before 2026-10-28).
- `REPRINT <time>` once the Z has been printed on paper (`zPrintedAt`). A Z that no printer
  printed at close carries no REPRINT on its first print; a PDF does not count as a print.

### Not on the X or Z

- **VAT per rate, discounts, product or category sales.** They describe the business day
  across tills, not one drawer, and the fiscal Z already carries VAT. They belong to a
  day report, which is not specified here.
- **Legal numbering.** The Z is identified by its session id, not a fiscal counter.
- **Grand totals** (perpetual totals that never reset). They need one store of truth
  across reinstalls and tills — phase 2.

## What is frozen at close

The close writes a **report snapshot** into the closed session (see
[Domain model](./02-domain-model.md#report-snapshot)): the cash block, tenders, refunds,
movement totals, counters, counted, over/short, reason and fiscal reference. The
snapshot is the Z. It is **never recomputed**: an order edited, refunded or synced after
the close does not change a closed session's Z, for the same reason the expected-cash
snapshot is immutable today.

The X is never stored.

## The guided close

The close dialog becomes the Z's producer. Steps:

1. **Count** — enter the counted total (unchanged).
2. **Reconcile** — expected, counted and over/short are shown **before** anything is
   committed; a reason is required over the threshold; going back to recount is free.
3. **Cash register Z number** — on the count screen, shown only when the till's *Uses a
   cash register* setting is on ([Settings](./06-settings-and-configuration.md)), and
   then **required**: the operator takes the device's Z and types its number — digits only,
   up to 12. With the
   setting off there is no field and the Z prints no fiscal line.
4. **Confirm** — restates the figures and warns that selling stops until the register is
   reopened (unchanged). The confirm button is disabled while the write runs, so a double
   tap cannot close twice.
5. **Print** — the Z prints when *Print the Z* is on (default: on). A failed
   print does not undo the close; the Z can be printed from the session book. Only a
   successful print marks the Z as printed.

The forced close of a **stale** session (a previous day's register left open) runs the
same steps except the confirm step, as today. Its Z is a normal Z; the business day is
the day the session opened.

## The X report

- **Where:** the register chooser, while a session is open: *X report*.
- **What:** the preview above with live figures, plus Print and PDF.
- **Loading:** figures come from the same session-orders query as expected cash; the
  preview waits for it and says so rather than print partial numbers.

## No-sale

The cart's *Cash drawer* button opens the drawer without a sale. It is enabled only
while a register session is open: it asks for a **reason** (required), logs a `no_sale`
movement with amount `0`, then opens the drawer. Otherwise it stays disabled, as it was
before, so the drawer never opens without a sale unless that is on record.

A no-sale changes no figure; it is counted because an unexplained drawer opening is the
easiest way to take cash without a record.

## Paper layout

Plain text through the receipt printer, the channel the old close summary used. Width
follows the printer's character width (48 on 80mm, 32 on 57mm); labels left, amounts
right; counted lines read `count   sum`. A row too wide for the roll puts its value on the
next line, right-aligned. Every date carries its short weekday in the app's language. The
printer prints the brand above it.

```
Z (NON-FISCAL)
Store Name · Till 1
Session reg_1761650000_ab12cd
Business day Wed 2026-10-28
Opened  Wed 2026-10-28 09:00
Closed  Wed 2026-10-28 18:30
--------------------------------
CASH
Float                      50.00
Cash sales                420.00
Cash refunds              -12.00
Pay-ins                    10.00
Drops                    -100.00
Expected                  368.00
Counted                   366.00
Over/Short     -2.00 SHORT
Reason: miscount on change
--------------------------------
TENDERS                 #   SUM
Cash                   18 420.00
Card                   25 910.50
Bank transfer           1 150.00
Internal transfer       0   0.00
Total                  44 1480.50
Unpaid (pay later)      2 300.00
--------------------------------
REFUNDS
Cash                    1  12.00
Other                   0   0.00
--------------------------------
MOVEMENTS
Pay-ins                 1  10.00
Drops                   1 100.00
No-sales                2
--------------------------------
Sales 43 · Cancelled 1
Cash register Z             0412
```

The PDF is the same text, transliterated to Latin, in a monospace font on one
receipt-width page (80 mm, like the order receipt PDF), centred and sized so the longest
line fits; saved to Downloads.

## Fiscal devices and card terminals

A recurring question is whether the reports of card terminals or fiscal devices make the
till's Z unnecessary. They don't; they **complement** it.

| Source | What its report covers |
|---|---|
| Online payment gateway | Its own online transactions only. No drawer, no in-store tenders. |
| Bank card terminal (settlement / batch report) | That terminal's card batch only. |
| Fiscal cash register or fiscal card terminal (fiscal Z) | The sales that went through **that device**, with VAT, under legal numbering. |

None of them covers:

- the counted drawer and the over/short;
- the float, pay-ins, drops and no-sales;
- one tender breakdown across cash, several card terminals and bank transfer;
- per-till totals tied to this system's orders and refunds;
- a stored, reprintable session history.

So the till keeps its Z, and does **not** rebuild the fiscal one: no VAT per rate, no
legal numbering. The **fiscal Z reference** links the two, so a reviewer can put the
till's Z next to the device's for the same day. The card total on the till's Z is the
figure to check against the terminal's batch report.

**Georgia (as of 2026-10, to be confirmed with an accountant):** a certified cash register
is required for cash settlement; card payments appear to fall outside that scope. New
devices must meet a new standard from 2027, and a *universal cash register* (cash and
card, reporting in real time) becomes mandatory on 1 May 2028. That reform is a reason to
move sessions to the backend (phase 2), not to fiscalise the till.

## Decisions

| Date | Decision |
|---|---|
| 2026-10-28 | The Z is **non-fiscal**: a drawer statement. The fiscal Z stays with the certified device; the till stores its reference. |
| 2026-10-28 | No VAT per rate, discounts or product sales on the X/Z; they belong to a day report. |
| 2026-10-28 | The Z is frozen at close and reprinted from stored figures, never recomputed. |
| 2026-10-28 | Zeros print. |
| 2026-10-28 | Only cash moves the drawer (unchanged). Rounding stays checkout-only (unchanged). One till = one session (unchanged). |
| 2026-10-28 | Pay-later orders with nothing captured are a separate *Unpaid* counter, not part of any tender. |
| 2026-10-29 | A Z says REPRINT only after its first paper print; a PDF is not a print. |
| 2026-10-29 | The cash register's Z number is digits only. |
| 2026-10-29 | The PDF is a receipt-width page, not A4. |
| 2026-10-29 | Every date on the X, the Z and the session book says which weekday it was. |
| 2026-10-28 | No-sale is a movement (`no_sale`, amount 0) with a required reason. The *Cash drawer* button works only while a session is open. |
| 2026-10-28 | Phase 1 is till-only; phase 2 (backend sessions) is a separate decision. |
| 2026-10-28 | A closed session is **never resumed**. Reopen starts a new session for the same business day, float = the counted cash. One Z per session, and one device Z per close. |
| 2026-10-28 | Nothing is built for the 2028 universal cash register now: the dates are unconfirmed and no device or protocol exists to build against. Revisit in early 2027, as part of phase 2. |
| 2026-10-28 | Stores do use a certified cash register. A per-till *Uses a cash register* setting (off by default) adds the fiscal Z step to the close, and with it on the reference is **required**. The till records the device's Z; it does not drive the device. |

## Open questions

1. **The 2028 universal cash register** — confirm the dates with an accountant before
   phase 2.
