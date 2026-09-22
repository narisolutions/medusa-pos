# Post-Sale: Returns, Exchanges & Additional Charges

Handle what happens to a sale **after** it is paid: goods coming back, goods swapped,
and extra items added to an order that already exists.

Refunds already shipped in v0.5.0 and are not covered here — this set of documents
covers the three post-sale operations that do not exist yet, and reuses refunds as the
way money goes back to a customer.

## Why it exists

A customer returns a corked bottle. A gift recipient wants a different vintage. Someone
who paid for a case asks to add two more bottles before leaving. Today the POS can only
refund money: it cannot take stock back, swap one product for another, or add to a
completed order. Staff either do it in Medusa Admin — off the till, with a different UI
— or fake it with a fresh sale and a manual refund, which breaks the audit trail and
leaves stock wrong.

## Three features, one foundation

| Feature | What the operator does | Medusa primitive |
|---|---|---|
| **Returns** | Takes goods back, decides per line whether they go back on the shelf | Return |
| **Exchanges** | Takes goods back and hands different goods out, settling any difference | Exchange (which owns a Return) |
| **Additional charges** | Adds items to an order that is already paid, and collects the extra | Order edit |

They are built in the order **Additional charges → Returns → Exchanges**. See
[Implementation plan](./09-implementation-plan.md) for why.

## The two facts that shape everything

> **1. Medusa's flows are built for mail order. A till is not mail order.**

Returns and exchanges in Medusa assume a request, a wait for the goods to arrive by
post, and a later receipt. At a counter the customer is standing there and the goods
change hands immediately. The POS compresses each flow into one confirmed operation.
See [Order changes](./03-order-changes.md).

> **2. Stock and money move at different moments, and neither moves when you expect.**

Confirming a return does **not** restock. Stock only returns when the goods are marked
*received* — and goods marked *damaged* never restock at all. Money never moves on its
own: every order change leaves an outstanding amount that the operator must settle.
See [Stock](./05-stock.md) and [Money](./04-money.md).

## Document index

| # | Document | What it covers |
|---|---|---|
| 1 | [Overview](./01-overview.md) | The three operator journeys and scope boundaries |
| 2 | [Domain model](./02-domain-model.md) | Return, return line, exchange, charge, outstanding amount |
| 3 | [Order changes](./03-order-changes.md) | The change lifecycle and how a till compresses it |
| 4 | [Money](./04-money.md) | Settling outstanding amounts — and the trap in the existing helper |
| 5 | [Stock](./05-stock.md) | Receive vs. dismiss, and when inventory actually moves |
| 6 | [UI flows](./06-ui-flows.md) | Entry point, dialogs, confirmation, activity timeline |
| 7 | [Edge cases](./07-edge-cases.md) | Partial returns, pay-later orders, concurrency, misconfiguration |
| 8 | [Portability](./08-portability.md) | Reusing this in a non-Medusa POS |
| 9 | [Implementation plan](./09-implementation-plan.md) | Phases, files, the verification spike, and test plan |

## Status

**Specified, not built.** Several behaviours below are marked *verify in spike* — they
depend on backend behaviour the Medusa documentation does not state, and must be
confirmed against a real backend before the code that relies on them is written.
