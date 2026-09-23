# 4. Money

## Nothing settles itself

Confirming an order change moves **no money**. It changes what the order is worth, and
leaves the difference as an **outstanding amount** on the order. Settling that amount is
a separate, explicit step — and until it is taken, the operation is not finished.

| Outstanding amount | Meaning | Settlement |
|---|---|---|
| `> 0` | Customer owes the store | Take payment |
| `< 0` | Store owes the customer | Refund |
| `= 0` | Even | Nothing to do |

## Settling in the store's favour: take payment

The customer pays at the till — cash, or a card on an external terminal — exactly as at
checkout. The POS then records that payment against the order.

**Only the outstanding amount is charged, never the order total.**

### The existing payment helper cannot be reused as-is

The checkout already has a routine that records payment against an order. It is the
obvious thing to reuse, and **it would silently charge nothing**. Three independent
reasons, any one of which is fatal:

1. **It exits early if the order is already paid.** Every order that reaches this
   feature *is* already paid — that is the premise. The routine returns before doing
   anything, and reports no error.
2. **It reuses the order's first payment record.** That record is the original sale's,
   already settled. A top-up needs a **new** payment record for the difference.
3. **It charges the order total**, not the outstanding amount.

The result would look like success: no error, the dialog closes, the order reads as
paid. The store would simply never have recorded the money.

This is the single most important thing in this document. The additional-charge
payment step must be written as its own routine that:

- always creates a **new** payment record,
- for exactly the **outstanding amount**,
- and ignores whether the order is already marked paid.

It may share the lower-level "open a payment session, then capture or mark as paid"
logic, but not the decision about *whether* and *how much* to charge.

## Settling in the customer's favour: refund

Refunds already exist (v0.5.0) and are reused unchanged. The refund dialog is opened
with the amount **prefilled from the outstanding amount** and locked to it, rather than
defaulting to the whole refundable balance as it does today.

The refund comes out of an **existing captured payment**. For an exchange that swaps a
card payment for a cheaper item, that is straightforward. It is not always possible —
see [Edge cases](./07-edge-cases.md#nothing-to-refund-against).

## The cash drawer

The drawer opens whenever cash changes hands in either direction — taking payment or
refunding — following the same rule checkout already uses: cash opens it, a transfer
never does.

## Cash reconciliation

When the register feature is enabled, every cash movement here must be attributed to the
**open register session**, exactly as a cash sale is. A cash refund at 5pm that is not
attributed reappears at close as an unexplained shortage.

A refund or payment taken while the register is closed must be refused, matching
checkout's behaviour.

## Backend mapping (Medusa)

> Outstanding amount → `order.summary.pending_difference`. Payment → a new payment
> collection for the difference, then a payment session, then capture or `markAsPaid`.
> Refund → `payment.refund` against an existing captured payment.
>
> **Verify in spike, all three before writing settlement code:**
> 1. The **sign** of `pending_difference`.
> 2. Whether confirming an edit or exchange **creates a payment collection** for the
>    difference automatically, or whether the POS must create it.
> 3. What `payment_status` an already-paid order reports once an edit raises its total —
>    `captured`, `partially_captured`, or something else. This decides whether anything
>    else in the app that reads `payment_status` starts misreporting the order.
