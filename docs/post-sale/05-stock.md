# 5. Stock

## Stock does not move when the return is confirmed

This is the part most likely to be built wrong.

Recording that goods are being returned changes **nothing** about stock. Inventory is
only adjusted when the goods are **received** — a separate, later step. A POS that
confirms a return and stops there has recorded that the customer handed bottles back,
while every one of those bottles is still missing from stock.

For a till that is never the intended outcome: the goods are physically on the counter.
So the POS always runs the receive step immediately. See
[Order changes](./03-order-changes.md#the-till-compresses-each-flow-into-one-operation).

## Every returned line gets a condition

Receiving a line is a choice between two outcomes:

| Condition | Stock | Use for |
|---|---|---|
| **Back to stock** | Added back to the location's available quantity | Sealed, sellable goods |
| **Damaged** | Recorded as returned; **not** added back | Broken, corked, opened, spoiled |

For a wine shop, *damaged* is not an edge case. Corked and broken bottles are a routine
return, and restocking one means the next customer is sold it.

**The condition has no default.** The operator must pick one per line. A default of
"back to stock" would be tapped through without thought and quietly put damaged goods
back on sale. A default of "damaged" would silently shrink stock on every genuine return.
Forcing the choice is the only honest option.

A line can be split: 6 returned, 5 back to stock, 1 damaged.

## Where stock goes back

Received stock is booked into a **stock location** — the terminal's configured one.

That setting is optional today. For returns it becomes **required**: without a location
there is nowhere to put the goods. When it is not set, the return action is disabled with
a reason and a link to the setting, rather than failing at confirm time.

## Exchanges

Inbound goods follow exactly the rules above — an exchange contains a return.

Outbound goods leave stock when they are **fulfilled**, the same moment a normal sale's
goods do. The POS fulfils outbound exchange items immediately, because the customer is
leaving with them. An exchange left unfulfilled shows goods as handed over while still
counting them as on the shelf.

## Additional charges

Added items are fulfilled immediately too, for the same reason. They are not stock the
customer will collect later — they are in the customer's hands.

## Backend mapping (Medusa)

> Receive → `return.initiateReceive`, then `return.receiveItems` for restocked lines and
> `return.dismissItems` for damaged ones, then `return.confirmReceive`. Only
> `confirmReceive` touches inventory; `confirmRequest` explicitly does not. Dismissed
> items are recorded with the `RECEIVE_DAMAGED_RETURN_ITEM` action and never restock.
> The location is `location_id` on the return, from the terminal's `stock_location_id`.
>
> **Verify in spike:** that `receiveItems` and `dismissItems` can be mixed on one return
> for different quantities of the same line.
