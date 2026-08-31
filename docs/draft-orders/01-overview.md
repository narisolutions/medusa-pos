# 1. Overview

## The cashier's journey

1. **Ring up** a few items as normal.
2. **Park** — tap *Park sale* in the action pad. Optionally name it ("Table 4", "red
   coat"). The cart empties and the till is free.
3. **Serve** the next customer normally.
4. **Resume** — open *Parked sales* in the sidebar, find the row, tap *Resume*. The cart
   refills with exactly what was parked.
5. **Take payment** as normal. The sale completes and disappears from the parked list.

At any point the cashier can **Discard** a parked sale instead of resuming it.

## What ships in Phase 1

**Park.** An eighth button in the checkout action pad. Enabled whenever the cart has
items. Prompts for an optional label, saves everything to the backend, and clears the
till.

**A Parked sales tab.** A new sidebar entry with a **count badge**, and a searchable list
showing label, id, when it was parked, customer, item count, and total. Each row has
explicit *Resume* and *Discard* buttons.

**Resume.** Refills the cart. If the cart is not empty, the cashier is asked what to do
with the current sale first (park it, or discard it).

**Stock re-check.** On resume, availability is re-read and the cart is annotated. Lines
that are now short or unavailable are flagged — in the cart, and in a warning toast.

**Cross-terminal.** Park at till 1, resume at till 2. The list is scoped to the sales
channel, not the terminal.

## What is deliberately out of scope

**No inventory hold.** Parking does not reserve stock. Anyone can sell the parked goods
in the meantime. See [Inventory & stock](./06-inventory-and-stock.md) — this is a
considered decision, not an oversight, and Phase 2 specs the alternative.

**No locking.** Two terminals can resume the same parked sale simultaneously. Last write
wins, silently. See [Edge cases](./08-edge-cases.md#two-terminals-resume-the-same-sale).

**No expiry.** Parked sales live until someone resumes or discards them. Nothing is
swept, and nothing is deleted on the operator's behalf. A forgotten sale from last week
is still there — visible, and safe.

**No per-cashier ownership.** Parked sales are not attributed to whoever parked them, and
anyone can resume anyone's. Adding identity here waits on
[role management](../role-management/README.md).

**Payment method is not carried across.** The cashier re-picks it on resume. This is
correct: the till, and therefore the available methods, may differ.

## Boundaries with other features

| Feature | Interaction |
|---|---|
| [Cash reconciliation](../cash-reconciliation/README.md) | Parking requires an **open register** when the register feature is enabled. A parked sale contributes nothing to expected cash until it is actually paid. |
| Sales channel | The list is scoped to the active channel. Switching channels hides parked sales belonging to the other one — they are not lost, just out of scope. |
| Customers | If a customer was attached before parking, they survive the round trip and pre-fill the label suggestion. |
