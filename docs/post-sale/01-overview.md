# 1. Overview

All three operations start from the **order page** of a sale that has already been paid.

## Journey: a return

1. A customer brings back two bottles from yesterday's order.
2. The cashier opens the order and chooses **Return items**.
3. They pick the lines coming back and how many of each.
4. For each line they choose a condition: **back to stock**, or **damaged** (corked,
   broken, opened). Damaged goods are recorded but never return to the shelf.
5. They optionally pick a return reason.
6. They confirm. The return is recorded and received in one step.
7. The screen shows the amount owed back. The cashier refunds it — to the original
   method, or as cash from the drawer.

## Journey: an exchange

1. A gift recipient wants a 2019 instead of the 2021 they were given.
2. The cashier opens the order and chooses **Exchange items**.
3. **Coming back:** they pick the 2021, and its condition.
4. **Going out:** they scan or search the 2019, exactly as at checkout.
5. The screen shows the difference, live, as lines are added.
6. They confirm. Then, depending on the difference:
   - **customer owes more** → take payment, exactly as at checkout
   - **customer is owed** → refund the difference
   - **even** → nothing to settle; the exchange is complete

## Journey: an additional charge

1. A customer who just paid for a case asks to add two more bottles.
2. The cashier opens the order and chooses **Add items**.
3. They scan or search the extra bottles.
4. They confirm, and take payment for the difference only — never the whole order again.

## What ships

**Returns**, **exchanges** and **additional charges** from the order page, each settled
immediately at the till, with every step visible in the order's activity timeline.

## Deliberately out of scope

**Claims.** Medusa separates *claims* (the retailer's fault — wrong or damaged goods
shipped) from exchanges (the customer's choice). At a counter the cashier sees the
goods before the customer leaves, so shipping errors largely do not arise. Claims can
follow later on the same foundation.

**Mail-order returns.** No "customer will post it back" flow. The POS only handles
goods that are physically present. Remote returns stay in Medusa Admin.

**Store credit.** Refunds go back to a payment method. Medusa can refund to store credit
only with its Loyalty plugin, which this store does not run.

**Removing items from an order without a return.** Reducing a line on a paid order is a
return, not an edit — goods must come back to stock, or be recorded as not returned.
Order edits here only ever **add**.

**Changing prices after the fact.** Additional charges add items at their current
price. Retroactively discounting a paid line is a refund, and already exists.

## Boundaries with other features

| Feature | Interaction |
|---|---|
| Refunds (v0.5.0) | The settlement path for any amount owed back. Not reimplemented. |
| [Cash reconciliation](../cash-reconciliation/README.md) | Cash refunded or collected here must count toward expected cash, attributed to the open register session. |
| [Draft orders & parked sales](../draft-orders/README.md) | Unrelated — those operate on unpaid sales. Nothing here touches a draft. |
| Receipt printing | Each operation should produce a slip showing what came back, what went out, and what was settled. |
