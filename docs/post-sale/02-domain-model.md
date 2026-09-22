# 2. Domain model

All amounts are in **display units** (e.g. `50.00` = fifty in store currency).

## `Return`

Goods coming back from a completed sale.

```ts
type Return = {
  id: string;
  orderId: string;
  lines: ReturnLine[];
  locationId: string;      // where received stock is booked back in
  createdAt: string;
  receivedAt?: string;     // set when the goods are confirmed received
};
```

## `ReturnLine`

```ts
type ReturnCondition = "restock" | "damaged";

type ReturnLine = {
  orderLineId: string;     // the line on the ORIGINAL order — not a variant
  quantity: number;        // ≤ the line's still-returnable quantity
  condition: ReturnCondition;
  reasonId?: string;
  note?: string;
};
```

### Field semantics

- **`orderLineId`** references the original order's line, never a variant. The same
  variant can appear on an order more than once at different prices, and the refund
  value is the price that line was actually sold at.
- **`quantity`** is capped at what has not already been returned. A line of 6 with 2
  already returned has 4 returnable — never 6.
- **`condition`** is the most important field in this model and has **no default**.
  `restock` puts the goods back on the shelf; `damaged` records them as returned but
  never makes them sellable. The operator must choose, because the wrong answer either
  sells a broken bottle or silently loses stock. See [Stock](./05-stock.md).

## `Exchange`

A return and a new outbound shipment, settled as one operation.

```ts
type Exchange = {
  id: string;
  orderId: string;
  inbound: ReturnLine[];   // coming back — same shape as a return
  outbound: OutboundLine[];// going out
  returnId: string;        // an exchange OWNS a return
};

type OutboundLine = {
  variantId: string;       // outbound is a variant: it is new goods, not an order line
  quantity: number;
  unitPrice: number;
};
```

The asymmetry is deliberate: **inbound references what was sold; outbound references
what is being sold now.** Mixing them up is the easiest way to mis-price an exchange.

An exchange is not a separate concept from a return — it contains one. Inbound goods are
received through the return, which is why [returns are built first](./09-implementation-plan.md).

## `Charge` (additional items)

```ts
type Charge = {
  orderId: string;
  lines: OutboundLine[];   // additions only — see Overview for why nothing is removed
};
```

## `OutstandingAmount`

The one number every operation ends with.

```ts
// Positive: the customer owes the store. Negative: the store owes the customer.
type OutstandingAmount = number;
```

Every operation — return, exchange or charge — ends with an outstanding amount, and the
operation is not finished until it is **settled to zero**. A return with an unsettled
negative amount means goods came back and the customer was never refunded.

### Backend mapping (Medusa)

> Return → **return**; exchange → **exchange** (its `return_id` links the owned return);
> charge → **order edit** restricted to `ITEM_ADD` actions; outstanding amount →
> `order.summary.pending_difference`.
>
> **Verify in spike:** the sign convention of `pending_difference`. Medusa's types carry
> no docstring for it and the documentation does not state it. The convention above —
> positive means the customer owes — is the assumption to confirm, and every settlement
> branch depends on it being right.
