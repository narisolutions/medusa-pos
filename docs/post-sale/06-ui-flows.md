# 6. UI flows

All controls follow the app's touchscreen rules: tap targets ~48px (never below 44px),
body text ≥16px, choosers as large stacked buttons rather than dropdown rows, and state
conveyed by more than colour alone.

## One entry point, not three buttons

The order page header already carries up to four conditional actions — record payment,
refund, create shipment, mark picked up — plus Back. Three more buttons would overflow on
a till screen and bury the ones cashiers use most.

Instead, a single **Return or exchange** button opens a chooser with three large stacked
options:

- **Return items** — goods coming back, nothing going out
- **Exchange items** — goods coming back, different goods going out
- **Add items** — extra goods on a paid order

The button appears only when at least one option is possible for this order. Each option
inside is enabled or disabled individually, with a reason when disabled — never hidden.

## Picking what comes back

A list of the order's lines, each showing product, sold quantity, and **how many are still
returnable**. Each line has a quantity stepper capped at that returnable count.

Once a quantity is above zero, the line expands to require a condition:

- **Back to stock**
- **Damaged**

Two large buttons, no pre-selection. Confirm stays disabled until every line with a
quantity has a condition. Where the quantity is more than one, the line can be split
between the two.

An optional reason and note sit below.

## Picking what goes out

Reuses the checkout's product search, barcode input and variant chooser — the cashier
already knows it. Scanned items land in an outbound list with quantity steppers.

## The running difference

Visible throughout an exchange or a charge, pinned to the bottom of the dialog:

> **Coming back** −₾90.00   **Going out** +₾120.00
> **Customer pays ₾30.00**

The last line always states the **direction** in words — *customer pays*, *refund
customer*, *even* — never just a signed number. A cashier reading `−30.00` under pressure
can get the direction wrong; a sentence cannot be misread.

The figure shown here is a **local estimate** for guidance while building the change. The
amount actually settled is the one the backend returns after confirmation. If they
differ, the backend's wins, and the dialog shows the corrected figure before any money
moves.

## Confirm and settle

One **Confirm** button runs the whole operation. While it runs, it shows a spinner and
the step in plain words — *Recording return…*, *Receiving goods…* — so a slow backend
does not look like a frozen screen.

The dialog cannot be dismissed while running.

Then, depending on the confirmed outstanding amount:

- **Customer pays** → the payment step, identical to checkout: pick method, take cash or
  card, confirm.
- **Refund customer** → the existing refund dialog, amount locked to the difference.
- **Even** → straight to done.

## Done

A success toast naming the order, and a receipt slip offered for print. The order page
refreshes in place.

## Activity timeline

The order's existing activity timeline gains events, each with who-what-when:

| Event | Shows |
|---|---|
| Return received | Lines and quantities, split into *restocked* and *damaged* |
| Exchange completed | What came back and what went out |
| Items added | What was added |
| Additional payment | Amount and method |

Refunds already appear on the timeline and are unchanged. Together these are the audit
trail the roadmap promises.

## Failure

If the operation fails partway, the POS cancels the open change, then says plainly what
happened and that **nothing was applied** — or, if cancelling also failed, that a change
may be left open on this order and must be checked in Medusa Admin. See
[Order changes](./03-order-changes.md#the-rule-a-change-is-either-fully-applied-or-fully-discarded).
