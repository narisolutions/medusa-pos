# Draft Orders & Parked Sales

Let a cashier **park** an in-progress sale, serve someone else, and **resume** it later —
from this terminal or another one.

This feature is **always on**. There is no enable toggle: parking is a neutral capability
that costs nothing when unused. (The Phase 2 *inventory hold* is a separate, opt-in
setting — see below.)

## Why it exists

A customer goes back for a forgotten bottle. A delivery arrives mid-transaction. A group
wants to keep a tab open while they browse. Without parking, the cashier's only options
are to hold up the queue or clear the cart and re-ring every line by hand.

## The core invariant

> **Any draft order that still exists is an unfinished sale.**

Completing a sale *consumes* its draft, and clearing the cart *deletes* it. So a draft
that survives is, by definition, work in progress. This single rule is what lets the
parked-sales list be a plain unfiltered query — no status column, no "is parked" flag, no
reconciliation between two notions of pending. See
[Domain model](./02-domain-model.md#why-there-is-no-parked-flag) for why this matters
more than it might appear.

## Document index

| # | Document | What it covers |
|---|---|---|
| 1 | [Overview](./01-overview.md) | What ships in Phase 1, the cashier's journey, scope boundaries |
| 2 | [Domain model](./02-domain-model.md) | `ParkedSale`, the identity rule, why there is no parked flag |
| 3 | [Lifecycle & state](./03-lifecycle-and-state.md) | The state machine and the single-active-cart invariant |
| 4 | [State & persistence](./04-state-and-persistence.md) | What is stored where, and the **item-metadata contract** |
| 5 | [UI flows](./05-ui-flows.md) | Park button, the list, resume chooser, discard confirm |
| 6 | [Inventory & stock](./06-inventory-and-stock.md) | Why Phase 1 holds nothing, and what it does instead |
| 7 | [Reservations (Phase 2)](./07-reservations-phase-2.md) | The inventory-hold spec, not yet built |
| 8 | [Edge cases](./08-edge-cases.md) | Concurrency, restarts, conversions elsewhere, misconfiguration |
| 9 | [Portability](./09-portability.md) | Reusing this in a non-Medusa POS |

## Scope

| | Phase 1 (this release) | Phase 2 (spec only) |
|---|---|---|
| Park / resume / discard | ✅ | |
| Cross-terminal visibility | ✅ | |
| Optional sale label ("Table 4") | ✅ | |
| Stock **re-check** on resume | ✅ | |
| Stock **hold** while parked | ❌ | ✅ opt-in |
| Locking against concurrent resume | ❌ | ❌ |
| Automatic expiry of old parked sales | ❌ | hold expiry only |

Phase 1 deliberately ships **without** an inventory hold. Parked stock stays sellable, and
the operator is told the truth at the moment they resume. [Inventory &
stock](./06-inventory-and-stock.md) explains why that is the honest design and
[Phase 2](./07-reservations-phase-2.md) explains what holding would actually cost.
