# 8. Edge cases

| Case | v1 behavior |
|---|---|
| Feature disabled | All register surfaces dormant; POS behaves as if the feature doesn't exist |
| Mid-day app restart | Open session stays open; **no** re-prompt |
| Accidental / premature mid-shift close | **Reopen** starts a second session for the day, float = counted cash; checkout is blocked until then so no cash goes untracked |
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
| Fraud — fake close count | Required reason over threshold + immutable expected snapshot. **No authority gate** — see the note below |
| Fiscal device on another till, or one device for several tills | Each till's Z covers its own session; the fiscal Z reference may repeat across them. Card totals are checked against each terminal's batch report |
| No fiscal device | *Uses a cash register* stays off: no fiscal step at close, no fiscal line on the Z |
| Cash register setting switched on or off mid-session | Read at close only; it changes what that close asks for, nothing already recorded |
| Missed close (register left open overnight) | The forced reconcile produces a normal Z for the day the session opened |
| Session's sales fail to load at close | The close is refused, with Retry, until they load, so a Z never freezes figures from a failed read |
| Z print fails at close | The close stands; reprint from the session book |
| Reprint after orders changed | The reprint uses the frozen snapshot; later edits or refunds never change a closed Z |
| Close made before the snapshot existed | Its Z shows the stored figures and marks tenders and counters *not recorded* |
| Reopen after a Z printed | The printed Z stays valid; the second session gets its own Z (and, with a cash register, its own device Z number) |
| Fraud — drawer opened without a sale | Logged as a `no_sale` movement with a required reason and counted on the X and Z |
| Fraud — reopen to reset a discrepancy | A reopen cannot touch a closed session: its expected, counted and over/short are frozen, and the next session starts from what was counted. A new business-day open also archives before opening. **No authority gate** — see the note below |

## Authority is not enforced on the device

The two fraud rows above once relied on a manager PIN. It was removed: a PIN stored on
the terminal is a shared secret, not an identity — every cashier learns it, and it
proves nothing about *who* closed the drawer. Authority belongs with server-enforced
staff roles, which is backend work that does not exist yet.

Until it does, the register is **preventively ungated**: any operator can close or
reopen. What survives is evidential — the expected total is snapshotted and immutable,
a reason is forced over the threshold, and a closed session is never resumed, so its
figures cannot be rewritten. That catches a discrepancy after the fact; it does not stop one.

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
