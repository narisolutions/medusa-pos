# 3. Business day & expected cash

## Business day

A "business day" is **not** a calendar day. Late-night sales (e.g. a bar serving past
midnight) must stay in the same shift, so the day boundary is a **configurable cut-off
hour** (default `0` = midnight).

```
businessDay(timestamp, cutoffHour) -> a stable day key (e.g. "2026-06-19")
```

Logic: subtract `cutoffHour` hours from the timestamp, then take the calendar date of the
result. With `cutoffHour = 4`, anything before 4am counts as the **previous** business
day, so a sale at 1am closes under yesterday's shift.

The open dialog is shown when:

```
no session  OR  session.status === "closed"
            OR  businessDay(session.openedAt) < businessDay(now)
```

That is: a new business day has started and there is no open session for it.

> **Design note:** comparing **business-day keys** (not raw timestamps) is what makes the
> "once per day" prompt correct across the cut-off. A naive `openedAt < startOfToday`
> check breaks for late-night shifts.

## Expected cash formula

```
expected = openingFloat
         + sum(cash portion of each non-cancelled sale in the session)
         - sum(cash refunds in the session)
         + sum(pay-in movements)
         - sum(drop movements)
```

### Rules

- **Cash only.** Card / other tenders do not move the drawer total in v1.
- **Split payments** count the **cash portion only**. A sale paid partly by card and
  partly by cash contributes just its cash amount.
- **Cancelled / voided** orders are excluded entirely.
- **Refunds** of cash subtract.
- Movements are applied by **type**: `payin` adds, `drop` subtracts.

### Determining "is this sale cash?"

This is the one place that touches the backend's payment model. In this app the helper
`getOrderPaymentMethodType(order, store)` returns `"cash" | "card"`. In a different POS,
replace it with that system's notion of tender type. See
[Portability](./09-portability.md).

## Why snapshot at close

`expectedCash` is computed live **during** the shift for display, but the value written
into the closed session is the snapshot **at the moment of close**. Orders, refunds, or
late syncs that arrive afterwards must not retroactively change a recorded difference.
