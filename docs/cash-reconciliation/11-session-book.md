# 11. Session book

The list of the till's closed register sessions, each with its Z. Today the closes are
stored (`closed_register_sessions`) but cannot be seen; the session book is the screen
for them.

> **Status:** built on `feat/x-z-reports` (phase 1, till-only), not yet released.

## Where

**Register → History**, a screen of its own (a route in the route config). It is reached
from the register chooser in every state while the feature is enabled:

| Register state | Chooser actions |
|---|---|
| Open | Cash drop / pay-in · X report · Close register · History |
| Closed earlier today | Reopen · History |
| Otherwise | History |

The register sidebar item stops being inert in the last state: tapping it opens the
chooser with History only. With the feature disabled it stays hidden, as today.

## The list

Newest first, one large row per closed session:

| Column | Source |
|---|---|
| Business day | `businessDay(openedAt, cutoffHour)`, with its weekday |
| Opened · Closed | `openedAt`, `closedAt` |
| Expected | `expectedCash` |
| Counted | `countedCash` |
| Over/short | `difference`, with `OVER` / `SHORT` / `BALANCED` (and a mark, not colour alone) |
| Fiscal Z ref | `fiscalZRef`, or `—` |
| Status | `VOIDED` badge on a legacy voided close |

Rows are touch-sized (the app's list-row height); the list is read-only.

## A session's Z

Opening a row shows that session's **Z preview** — the same layout as at close (see
[X and Z reports](./10-x-and-z-reports.md#paper-layout)) — with **Print** and **PDF**.

- **Built from stored figures only.** The Z is rendered from the session's frozen report
  snapshot. Nothing is fetched, nothing recomputed; the screen works offline.
- **Reprints say so:** `REPRINT <time>` under the title, once the Z has been printed on
  paper — at close or from here. A Z no printer printed at close prints without it the
  first time; saving a PDF does not count.
- **A reopened day** shows one row per session: the first close and the session that
  followed it each have their own Z.
- **Legacy voided closes** (a reopen before 2026-10-28 resumed the session) show their
  Z with `VOIDED <time>`; they stay in the book for audit.
- **Sessions closed before the snapshot existed** have no tenders or counters. Their Z
  shows the figures that were stored (float, movements, expected, counted, over/short,
  reason) and marks the rest *not recorded*. It never fills them in from today's orders.

## Retention

- The book holds the **latest 100 closes** on this till (the existing `HISTORY_LIMIT`).
  When a close is added past that, the oldest is dropped.
- It is per-till: another till's sessions are not here.
- It survives logout and is wiped by a backend URL change, like the rest of the register
  ([State & persistence](./04-state-and-persistence.md)).
- To keep a Z beyond the cap or off the device, save it as **PDF**. A store-wide,
  permanent book is phase 2.

## Decisions

| Date | Decision |
|---|---|
| 2026-10-28 | The session book reads `closed_register_sessions` as is; no new storage key. |
| 2026-10-28 | A Z is rendered only from stored figures; legacy closes show *not recorded* instead of recomputed values. |
| 2026-10-28 | The 100-close cap stays; PDF is the way to keep more until phase 2. |
| 2026-10-29 | REPRINT follows `zPrintedAt`, set on the first paper print, not the place the Z was opened from. |
