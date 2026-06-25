# 8. Edge cases

| Case | v1 behavior |
|---|---|
| Feature disabled | All register surfaces dormant; POS behaves as if the feature doesn't exist |
| Mid-day app restart | Open session stays open; **no** re-prompt |
| Overnight / multi-day stale open session | Force-close (reconcile) the old business day before opening today's |
| Day rollover while app backgrounded | `visibilitychange` re-checks the business day and prompts if needed |
| Split payment | Only the **cash portion** counts toward expected |
| Cash refund | **Subtracts** from expected |
| Cancelled / voided order | **Excluded** from expected |
| Logout mid-shift, other cashier logs in | Session **preserved** (logout keeps register keys) |
| Backend URL change | Session **wiped** (clean slate) |
| Missing / corrupt storage | Treated as "no open register" → safe open prompt; never assume an open drawer |
| Orders predating rollout (no `register_session_id`) | Fall back to a `created_at >= openedAt` window; the first session has a documented gap |
| Late-night sales | Stay in the same session per the configurable cut-off |
| Fraud — fake close count | Manager PIN + required reason over threshold + immutable expected snapshot |
| Fraud — reopen to reset a discrepancy | Closed session archived to the bounded list **before** a new open; the over/short can't be erased |

## Notes

### Order attribution: id vs. time window

Sales are attributed to a session two ways, in priority order:

1. **`register_session_id`** stamped into the order's metadata at checkout — exact.
2. **Time window** (`created_at >= session.openedAt`) — fallback for orders created
   before the feature existed, or by another terminal/path that didn't stamp the id.

The id path is preferred; the time window prevents a hard dependency on the stamp.

### "Never assume an open drawer"

Any ambiguity (corrupt JSON, missing key, unparyseable session) resolves to **no open
register**, which forces the safe open prompt. The opposite default (assume open) would
let untracked cash flow, which is the exact thing this feature prevents.
