# 8. Edge cases

## Concurrency

### The sale was paid or deleted on another terminal

Resume finds nothing. Show "This sale is no longer available", refresh the list, and
**leave the local cart untouched**.

That last clause is the important one. A naive implementation clears the cart on any load
failure — which means failing to load *someone else's* stale sale would destroy whatever
the cashier currently had rung up. Load errors must only ever affect the cart they belong
to.

### Two terminals resume the same sale

Both succeed. Both carts bind to it. Whichever saves last wins, and the other cashier's
edits vanish with no warning.

Phase 1 has **no locking**. The list refreshes about once a minute, which narrows the
window but does not close it. Practically this is rare — two cashiers rarely reach for the
same parked sale — but it is real, and it is the main thing a future locking mechanism
would address. Phase 2's hold tag is the natural place to build a soft claim.

### The sale is stuck mid-edit

A save that dies between opening and confirming an edit leaves the sale in a pending
state, and the next save may refuse. This is reachable today; parking multiplies how many
sales can be sitting in it.

On resume: detect the pending edit, confirm it, re-read the sale, then proceed. **This is
the riskiest interaction in the feature** — test it hardest, and prefer recovering over
reporting an error the cashier cannot act on.

## Restarts and crashes

### The app dies mid-park

The cart is persisted on every mutation, so the till comes back with the cart still bound
and dirty. The cashier parks again. Nothing is lost.

This is exactly why park must be **atomic** — see
[Lifecycle](./03-lifecycle-and-state.md#atomicity). A non-atomic park can persist one
sale's id against another's lines, and the next save then rewrites the wrong sale.

### The stored cart points at a sale that no longer exists

Someone paid it on another till. The next attempt to save fails with an opaque error.

Recover: clear the bound id, **keep the lines**, and save again as a new sale. The cashier
keeps their work and never learns anything went wrong.

## Configuration

### No customer identity configured

Creating a sale requires an email — from an attached customer, or the store's configured
guest address. With neither, **parking is impossible**.

Handle it honestly: refuse, explain why, and link to the setting. In the resume chooser,
disable *park current sale* with a visible reason rather than hiding it. Do not pretend
the park succeeded, and do not silently discard.

This is the one hard blocker in the feature, and it is worth catching in setup rather than
at the till.

### The register is closed

When the register feature is enabled and the register is closed, parking is refused with
the same message as taking payment. Parking is a step inside a sale; if the till is closed
the sale should not come into existence.

### The sales channel is switched

Parked sales belonging to the previous channel disappear from the list. They are not
deleted — they are out of scope, and reappear if the channel is switched back.

Worth verifying: the local cart is **not** cleared on a channel switch, so a sale bound
under the old channel can survive into the new one. Decide deliberately whether to clear
or to carry it.

### The terminal is pointed at a different backend

Everything local is wiped, including the active cart. Parked sales on the old backend are
irrelevant — different data entirely.

### Logout

The cart is **preserved**. A parked or in-progress sale belongs to the till, not the
cashier, and must survive a shift change. This matches how register sessions are treated.

## Data

### Stock changed while parked

Covered in [Inventory & stock](./06-inventory-and-stock.md). Summary: re-check on resume,
warn, never silently clamp, and allow quantity *decreases* on over-limit lines.

### A product was deleted or unpublished

The line survives with zero availability and is flagged unavailable. Do not drop it — a
line vanishing from a resumed sale with no explanation is worse than a line the cashier
must consciously remove.

### A very old parked sale

Nothing expires. A sale parked last month still resumes, with prices as they were parked
and a stock warning if the world has moved on. Whether stale sales should be surfaced —
sorted last, or flagged — is a judgement call worth revisiting once there is real usage
data.
