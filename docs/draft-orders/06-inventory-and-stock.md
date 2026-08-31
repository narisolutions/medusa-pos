# 6. Inventory & stock

## Phase 1 holds nothing

Parking a sale does **not** reserve its stock. Between park and resume, anyone can sell
the goods — another till, the web store, anyone.

This is a deliberate choice, and it is worth being precise about why.

### Why not just hold it?

Holding stock sounds simple and is not. The backend creates its **own** reservations when
a sale is converted into an order. A hold placed at park time is still open at that
moment, so the same units end up reserved twice: availability drops by double, and when
the goods are eventually shipped only the backend's own reservation is released. The
manual hold is left orphaned, and that stock is quietly unsellable **forever**, until
someone finds and deletes it by hand.

Getting this right needs a release step wired into the conversion path, a rollback if
conversion then fails, and a background sweeper to clean up holds whose sale no longer
exists. None of that is unreasonable — it is specified in full in
[Phase 2](./07-reservations-phase-2.md) — but shipping it *hastily* means shipping a slow
inventory leak, which is far worse for a retailer than not holding stock at all.

So Phase 1 does the honest thing instead: it tells the cashier the truth at the moment it
matters.

## Re-checking stock on resume

The availability figure stored against each line is a **snapshot** taken when the item was
added to the cart. After a park it may be days old. It is therefore overwritten on every
resume, never trusted from storage.

Availability comes from the product catalogue the till already has cached for the checkout
screen — no new endpoint, and no extra round trip in the common case.

Each line is then classified:

| Class | Condition | Behaviour |
|---|---|---|
| **ok** | requested ≤ available | nothing |
| **reduced** | 0 < available < requested | keep the quantity, warn |
| **unavailable** | available = 0, or the variant is gone from the catalogue | keep the line, warn |

### Never silently clamp

A resumed sale is an agreement the cashier already made with a customer. Quietly reducing
a quantity to fit current stock would hide that something changed, and the cashier would
discover it at payment, in front of the customer, with no idea why.

Keep the requested quantity. Say what changed. Let the human decide.

## A trap this creates

Once a resumed line can hold more units than are available — 5 in the cart, 1 in stock —
the cart's own stock guard becomes a problem. A naive guard rejects *any* quantity above
availability, which means the cashier cannot even reduce 5 to 4. The line becomes
un-editable except by deleting it entirely.

**The guard must reject only increases past availability**, never decreases. Moving
towards a valid state is always allowed. This only becomes reachable once fresh
availability is written onto a resumed cart, so it is a trap this feature creates and must
therefore close.

## Where enforcement actually lives

Nothing above *enforces* anything. It informs.

Real enforcement happens at **conversion** — the backend refuses to create an order it
cannot satisfy. That is the correct place for it: it is the only moment where the check
and the commitment are atomic.

The consequence is that the failure surfaces late, at payment, as a backend error. That
error must be translated into something a cashier can act on — naming the product and the
shortfall — rather than surfacing raw. An unreadable error at the moment of taking money
is the single worst place to have one.

## Known limitation

The availability figure read from the catalogue may be **stocked quantity** rather than
**available** (stocked minus everyone else's reservations). If so, the re-check is blind
to holds placed by other terminals and will over-report availability.

This is tolerable in Phase 1, where the check is advisory. It is **disqualifying** for
Phase 2, where hold decisions depend on it — so verify which figure it actually is before
building reservations on top.
