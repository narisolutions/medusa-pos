# 3. Lifecycle & state

## The single-active-cart invariant

> **A till has exactly one cart, and that cart is bound to at most one saved sale.**

Everything here follows from that. The terminal never holds two carts in memory, never
merges two sales, and never edits a saved sale it does not currently have open. Parking
is not "adding a sale to a list" — it is **detaching** the one cart from the till.

The cart is therefore always in one of three states:

| State | `saleId` | `items` | Meaning |
|---|---|---|---|
| **Empty** | none | none | Till is free |
| **Unbound** | none | some | Rung up, never saved |
| **Bound** | set | some | Open, and saved to the backend |

An **unbound** cart is the normal state during a fast sale: items are rung and payment is
taken without the sale ever being saved. Saving happens lazily, at park or at payment.

## Transitions

```
                 ┌─────────────────────────────────┐
                 │                                 │
                 ▼                                 │
            ┌─────────┐   add item    ┌───────────┐│
    ┌──────▶│  EMPTY  │──────────────▶│  UNBOUND  ││
    │       └─────────┘               └───────────┘│
    │            ▲                          │      │
    │            │                     save │      │ discard
    │    release │                          ▼      │
    │            │                    ┌───────────┐│
    │            └────────────────────│   BOUND   │┘
    │                        park     └───────────┘
    │                                   │       ▲
    │                          pay      │       │ resume
    │                                   ▼       │
    │                              ┌─────────┐  │   ┌────────────┐
    └──────────────────────────────│  ORDER  │  └───│   PARKED   │
                  cart cleared     └─────────┘      └────────────┘
```

- **save** — create the sale on the backend if needed, then push local changes to it.
- **park** — *save*, then **release**: detach the cart and empty the till. The sale is now
  parked.
- **resume** — load a parked sale into the empty cart. It becomes bound.
- **pay** — convert the bound sale into an order. The saved sale ceases to exist.
- **discard** — delete the saved sale outright.

## Park

1. Refuse if the cart is empty.
2. Refuse if the register feature is on and the register is closed. *Parking is a step
   inside a sale; if the till is closed the sale should not come into existence.*
3. Refuse if the sale cannot be created (see
   [the identity requirement](./08-edge-cases.md#no-customer-identity-configured)).
4. Ask for an optional label.
5. **Save** — create if unbound, then push all local changes.
6. **Release** — detach and empty.

**If any step fails, do not release.** The cart stays bound and dirty; the cashier retries
or takes payment. Losing a cart to a network blip is the worst available outcome, and it
is worth an awkward retry to avoid.

## Resume

The cart may not be empty. Three cases:

| Current cart | Behaviour |
|---|---|
| **Empty** | Resume immediately |
| **Bound** | Confirm, then park the current sale, then resume the target |
| **Unbound** | Ask: *park current* / *discard current* / *cancel* |

The unbound case is the awkward one, because parking it requires **creating** a sale,
which can fail on the identity requirement. When it cannot succeed, that option must be
disabled and explained — leaving *discard* or *cancel*. Silently discarding is not an
option; neither is pretending the park worked.

Then: load the sale → re-check stock → **adopt** the cart → navigate to checkout.

## Discard

Delete the saved sale. Clear the cart **only if** the discarded sale is the one this till
currently has open. Discarding someone else's parked sale must never touch the local cart.

A sale that is already gone (converted or deleted elsewhere) counts as a successful
discard. The cashier wanted it gone; it is gone.

## Atomicity

**Adopting and releasing must each be a single indivisible state change.**

Binding an id and setting the lines are conceptually two operations. If they are allowed
to happen separately, there is a window in which the cart holds *one sale's id with
another sale's lines*. If the terminal dies in that window and later pushes local changes,
the diff will rewrite the wrong sale — in the park case, deleting every line of it.

So the state machine exposes exactly two compound operations:

- `adopt(saleId, items, metadata)` — bind and fill, in one step
- `release()` — unbind and empty, in one step

Nothing else may set the bound id to a non-null value.

## The sync flag

The cart tracks whether it matches its saved counterpart, so that pressing *Pay* on an
untouched cart does not trigger a pointless round trip.

- Any local mutation → **dirty**.
- Pushing changes → **clean**.
- **Adopt → clean.** A just-loaded cart matches by definition.
- **Release → dirty**, and meaningless, because nothing is bound.

The flag is a performance affordance, never a correctness one. Code must not assume a
clean cart is in sync with a backend it has not talked to — another terminal may have
changed the sale in the meantime.
