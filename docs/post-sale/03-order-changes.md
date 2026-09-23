# 3. Order changes

## The lifecycle, as the backend models it

Every post-sale operation is an **order change**: a staged set of actions against an
order that does nothing until confirmed.

```
  pending ──► requested ──► confirmed        applied to the order
     │            │
     └──► canceled┘                          discarded, order untouched
```

Actions accumulate while the change is open — add a return line, add an outbound item,
add a shipping method — and each one returns a **preview** of the order as it would
look. Nothing touches the order, its totals, or stock until confirmation.

## Why a till cannot use it as designed

Medusa's return and exchange flows model **mail order**:

```
request ─► customer approves ─► goods posted ─► goods arrive ─► received ─► settled
            (hours/days)        (days)
```

At a counter every one of those gaps is zero: the customer is present, the goods are on
the counter, and they leave within minutes. Exposing the intermediate states would
invent waits that do not exist, and leave changes stranded half-open when a cashier is
interrupted.

## The till compresses each flow into one operation

The operator builds the change in a single dialog. On confirm, the POS runs the whole
backend sequence back-to-back:

| Operation | Backend sequence run on confirm |
|---|---|
| **Charge** | open edit → add items → request → confirm |
| **Return** | open return → add lines → request → **start receive → receive or dismiss each line → confirm receive** |
| **Exchange** | open exchange → add inbound → add outbound → add outbound shipping → request → then the return's receive sequence |

Then the outstanding amount is settled. See [Money](./04-money.md).

## The rule: a change is either fully applied or fully discarded

A compressed sequence can fail halfway — a network drop after `request` but before
`confirm receive`. That leaves an open change on the order, which blocks further changes
and misrepresents what happened.

So the POS must:

1. **Stage everything locally first.** The dialog builds the change in memory. No
   backend call is made until the operator confirms.
2. **Run the sequence only on confirm**, and track how far it got.
3. **On failure, cancel the open change** (`cancelRequest`, or `cancel` once requested)
   rather than leaving it hanging.
4. **If cancelling also fails, say so plainly** and name the order. A stranded change is
   recoverable in Medusa Admin, but only if someone knows it exists.

Nothing about this is optional. Two tills retrying a half-applied return is how stock
gets counted back in twice.

## One change at a time

An order can have **one open change**. Before starting any operation, the POS checks for
an existing open change on the order. If one exists — from Medusa Admin, another till,
or an earlier failure — it must be resolved first, never silently stacked.

> **Verify in spike:** whether the backend rejects a second change or silently allows it.
> The POS must enforce this itself either way; the spike determines whether it is also a
> backend guarantee or purely a POS one.

## Notifications

Every backend call that accepts `no_notification` is sent with it **set to true**. The
customer is at the counter; an email saying their return was "requested" hours after
they walked out with a refund is confusing and wrong.
