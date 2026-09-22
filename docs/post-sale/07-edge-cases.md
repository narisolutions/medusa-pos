# 7. Edge cases

## Quantities

### A line partly returned before

Returnable quantity is **sold minus already returned**, never the sold quantity. A second
return on the same line must see the reduced count, including returns made in Medusa
Admin or at another till. The count comes from the backend, not from local state.

### Returning more than was sold

Impossible through the stepper, which caps at the returnable count. Still validated before
confirm, because a stale order page can hold an out-of-date cap.

### An added item then returned

Items added by an additional charge are ordinary order lines once confirmed, and are
returnable like any other.

## Orders that are not eligible

### A pay-later order that has not been paid

Nothing to refund against, and returning unpaid goods is a cancellation, not a return.
Returns and exchanges are disabled with a reason. Additional charges are allowed — they
simply add to what is owed.

### An order not yet fulfilled or delivered

Medusa returns operate on **delivered** goods. POS sales are fulfilled and marked
delivered at payment, so they qualify. An order created elsewhere and still unfulfilled
does not, and the actions are disabled with a reason.

> **Verify in spike:** the exact fulfilment state the backend requires before it accepts a
> return, and whether a POS sale's pickup fulfilment satisfies it.

### A canceled order

All three operations are disabled.

## Money

### Nothing to refund against

A refund must come out of an existing captured payment. If an exchange lowers the total
but the original payment was recorded without a capturable payment — some pay-later or
manually-marked orders — there may be nothing the backend will refund against.

The POS must detect this **before** confirming, not after: an exchange confirmed with no
way to refund the difference leaves the customer owed money with no path to pay it. In that
case, cash from the drawer is the settlement, recorded against the order.

> **Verify in spike:** which payment states can be refunded, and whether a refund can
> exceed a single payment by spanning several.

### The backend difference disagrees with the local estimate

Possible with promotions, rounding, or taxes the POS does not compute. The backend's figure
is authoritative; the dialog shows it and requires a second confirm before settling.

### Cash rounding

When cash rounding is enabled, a cash settlement rounds exactly as checkout does, and the
rounded figure is what gets recorded.

## Stock

### No stock location configured

Returns and exchanges require one. The actions are disabled with a reason and a link to the
setting. Additional charges do not need one.

### An outbound item is out of stock

Blocked at the point of adding it, exactly as checkout blocks it — not discovered at
confirm.

## Concurrency and failure

### An open change already exists on the order

From Medusa Admin, another till, or an earlier failure. The POS refuses to start a new
operation, names the existing change, and does not stack another on top.

### The operation fails partway

The POS cancels the open change. See
[Order changes](./03-order-changes.md#the-rule-a-change-is-either-fully-applied-or-fully-discarded).

### Settlement fails after the change is confirmed

The change is applied — goods received, items added — but payment or refund did not go
through. This is the one failure that **cannot** be undone by cancelling.

The POS must leave the outstanding amount visible on the order page, with the **Record
payment** or **Refund** action available to finish it. The operator is told the change was
applied and settlement is still owed. Never report this as a total failure: the goods have
already moved.

### The app restarts mid-operation

Staging is in memory, so an unconfirmed dialog is simply lost — nothing was sent. A restart
**during** the confirm sequence may leave an open change, caught by the open-change check
next time the order is opened.

## Configuration

### The register is closed

Any operation that moves cash is refused, matching checkout.

### No payment methods configured

Additional charges and exchanges that owe money cannot be settled, and are disabled.
