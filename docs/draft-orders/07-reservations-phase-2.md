# 7. Reservations — Phase 2 (specified, not built)

> **Status: not implemented.** This document specifies the inventory hold so it can be
> built deliberately rather than improvised. Nothing here ships in Phase 1.

## The setting

Behind **Settings → Preferences → Draft orders → Hold stock while parked**, **default
off**, mirroring how the register feature is gated.

**Hard requirement: a stock location must be configured.** Reservations are
location-scoped and there is no defensible default. With no location set, the toggle is
disabled with an explanatory hint, and parking falls back to Phase 1 behaviour.

## The hold record

One per cart line, per backing inventory item:

```
location_id        the terminal's configured stock location
inventory_item_id  the item backing this variant
quantity           line quantity × required quantity per unit
line_item_id       the saved sale's line
description        "pos-park:<sale_id>"      ← the queryable tag
metadata           { sale_id, variant_id, parked_at }
```

### `description` is load-bearing, not cosmetic

Releasing a hold means finding every reservation belonging to one parked sale. The
reservations API can filter by `description` but **not** by metadata — so the
`pos-park:<sale_id>` prefix is the only way to query them back.

Treat it as a contract. Changing the format orphans every hold created by an older build.

## Lifecycle

### Create — on park, after saving

Holds need line ids, so they can only be created once the sale is saved. If any hold fails
for want of availability, **roll back the ones already created for that sale and refuse
the park**. When the cashier has explicitly enabled holds, parking without the hold they
were promised is the wrong failure — say so and let them decide.

### Release — on resume, before adopting

Release first, then re-check stock. Otherwise the cashier's own hold makes their own items
look unavailable, and the resume warns about a shortage it created itself.

### Release — on conversion, immediately before

**This is where the risk lives.** Converting a sale into an order makes the backend create
its own reservations for the same lines. With the park hold still open, the same units are
reserved twice, availability halves, and at fulfilment only the backend's own reservation
is cleaned up — leaving the park hold orphaned and that stock permanently unsellable.

So: delete the park holds **immediately before** conversion, inside the same operation. If
conversion then fails, recreate them.

There is an unavoidable window between release and conversion in which another terminal
can take the stock. It is small, and strictly preferable to double-reserving. Do not try
to close it by holding through conversion.

> Upstream bugs worth reading before building this: medusajs/medusa#5198 (wrong allocation
> after completing a draft order) and #11266 (fulfilment sometimes failing to delete
> reservations). "Let the backend handle it" is not a safe assumption here.

### Release — on discard, after deleting the sale

Delete the sale **first**, then its holds. A failed delete must not free stock for a sale
that still exists.

## The sweeper is mandatory

Reservations have **no expiry**. Nothing cleans up a hold whose sale was converted or
deleted on another terminal, and nothing cleans up a hold for a sale nobody ever comes
back for.

Without a sweeper, this feature is an inventory leak with a slow fuse. It is not an
optional refinement.

On app start and on each refresh of the parked list:

1. List reservations at this location whose `description` starts with `pos-park:`.
2. Extract sale ids; list the sales that still exist.
3. Delete any hold whose sale is **gone**, or whose age exceeds `holdExpiryHours`
   (default 24; `0` disables expiry).

**Never auto-delete the sale itself.** Only release the hold, and mark the row *hold
expired* in the list. Destroying a cashier's parked work on a timer is not acceptable;
quietly returning stock to the shelf is.

## Kits and multi-item variants

A variant may be backed by more than one inventory item, each consumed at its own rate per
unit sold. Holds need that full mapping for **every** line, not just the multi-item ones.

Record it at add-to-cart time, when the data is already in hand:

```
inventory_items: [{ inventory_item_id, required_quantity }, …]
```

Recording it always — rather than only for multi-item variants, as the current line
metadata does — also removes the need for the existing catalogue-wide rescan used to
re-derive it. Older parked sales will lack the key, so fall back to a lookup at park time.

## Visibility

The parked list gains a **Held** column: a dot plus quantity when stock is held, "No
hold" when not, "Hold expired" when the sweeper has released it. Dot **and** label — never
colour alone.

The resume stock warning must state whether its numbers are hold-adjusted, or a cashier
will read "only 1 left" while holding 3 of them and reasonably conclude the system is
broken.
