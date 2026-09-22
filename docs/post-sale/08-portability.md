# 8. Portability — reusing this in a non-Medusa POS

The operator journeys, the condition-per-line rule, settlement, and the
all-or-nothing change discipline are generic. What is stack-specific is how an order
change is represented and applied.

## Generic (copy as-is)

| Piece | Notes |
|---|---|
| `Return` / `ReturnLine` / `Exchange` / `Charge` types | Pure data |
| `ReturnCondition` with **no default** | A product rule, not an implementation detail |
| Outstanding amount, settled to zero | Every operation ends here, in any system |
| Stage locally → apply on confirm → cancel on failure | The correctness requirement |
| One open change per order | Prevents double-counting stock |
| Direction stated in words (*customer pays* / *refund customer*) | Universal |
| One entry point with a chooser | A touchscreen layout rule |
| Settlement never re-charges the order total | The trap applies to any payment layer |

## Seams to reimplement

### 1. Applying a change

This app applies changes as backend **order changes** that are staged, requested and
confirmed. A simpler backend may just write the new order state directly. The contract the
UI needs:

```ts
type OrderChangeService = {
  returnable(orderId): Promise<Map<string, number>>;          // orderLineId → max qty
  applyReturn(orderId, lines: ReturnLine[]): Promise<number>; // → outstanding amount
  applyExchange(orderId, inbound, outbound): Promise<number>;
  applyCharge(orderId, lines: OutboundLine[]): Promise<number>;
  openChange(orderId): Promise<{ id: string } | null>;
};
```

Each `apply*` is atomic from the caller's point of view: it either returns an outstanding
amount or throws having changed nothing. Whatever multi-step choreography the backend
needs lives behind it.

### 2. Stock

This app relies on the backend adjusting inventory when a return is received, distinguishing
restocked from damaged lines. A POS that owns its own stock table implements that directly:
restocked quantity increments available stock; damaged quantity is written off.

### 3. Settlement

Taking payment and refunding reuse whatever payment layer the POS already has. The only
requirement is the one in [Money](./04-money.md): a top-up charges exactly the outstanding
amount, as a **new** payment, regardless of whether the order is already marked paid.

## What is Medusa-specific

- **Order changes are staged**, with `request` and `confirm` steps modelling mail order. The
  till compression in [Order changes](./03-order-changes.md) exists only because of this.
- **Confirming a return does not restock** — only confirming *receipt* does.
- **Damaged goods** are a distinct receive action (`dismissItems`) that never restocks.
- **An exchange owns a return**, received through the return API.
- **Outbound exchange shipping is required**, even at a counter; a pickup shipping option
  satisfies it.
- **Returnable quantity** is derived from `delivered_quantity` minus the returned and
  dismissed counts on each item's `detail`.
- **The outstanding amount** is `summary.pending_difference`.

## What is Tauri / React-specific

- The product picker is shared with checkout and must not write to the checkout cart.
- The operation state lives in the dialog, not in a store: nothing about a half-built
  return should survive leaving the order page.
