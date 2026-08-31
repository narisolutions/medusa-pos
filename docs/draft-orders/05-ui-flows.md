# 5. UI flows

All controls follow the app's touchscreen rules: tap targets ~48px (never below 44px),
body text ≥16px, action choosers as large stacked buttons rather than dropdown rows, and
state conveyed by more than colour alone.

## The Park button

Lives in the checkout action pad, **between *Clear cart* and *Payment***, completing the
three-column grid and leaving *Payment* in its familiar bottom-right position. Same size
and icon-over-label treatment as its neighbours.

Disabled while the cart is empty or an operation is in flight — the same condition as
*Clear cart*.

## The label dialog

One optional text field, pre-filled with the attached customer's name when there is one.
Two large buttons: **Park** and **Skip**.

The label is the single highest-value affordance in the whole feature, so the dialog is
worth the extra tap — but it must never block. *Skip* parks immediately with no name, and
the sale is then identified by its reference number.

## Feedback after parking

A success toast naming the sale, with a **View parked** action that jumps to the list.

**No success sound.** The completion chime means "money taken" and must stay unambiguous;
borrowing it for a park would train cashiers to mistrust it.

## The Parked sales list

A sidebar entry with a **count badge** — same treatment as the unfulfilled-orders badge,
capped at `99+`.

| Column | Notes |
|---|---|
| **Label** | Bold, primary. Falls back to the reference number when unnamed. |
| Reference | Muted `#1042` |
| Parked | Absolute time plus a muted relative suffix — "14:32 · 12 min ago" |
| Customer | Email or name, `—` when anonymous |
| Items | Total unit count |
| Total | Formatted in the sale's currency |
| Actions | **Resume** (primary) and **Discard** (destructive outline) |

Search filters across label, reference, and customer. There is no status filter — there is
no status — and no channel filter, since the channel is fixed by definition.

### Rows are not clickable

The orders list navigates on row tap. **This list does not.** Its row actions mutate the
cashier's live cart — resuming can park or discard whatever is currently on the till. On a
touchscreen, an accidental tap doing that is not recoverable. Only the explicit buttons
act.

### The "Active here" row

The sale currently open on this till legitimately appears in its own parked list. Rather
than hide it — which would make the list quietly lie — mark it:

- an **Active here** badge (dot **and** label, not colour alone),
- *Resume* becomes **Open**, which just navigates to checkout without touching the cart,
- *Discard* still works, and also clears the cart.

### Empty state

An empty list is the *normal* state, so it teaches rather than apologises: an icon, "No
parked sales", "Park a sale from the POS to come back to it later", and a button back to
the till.

## The resume chooser

Shown only when the cart is not empty. Large stacked buttons, most-common action first:

**Cart is bound (already saved):**
> *Park current sale and resume this one?* — the current sale is safe either way, so this
> is a plain two-button confirm.

**Cart is unbound (never saved):**
> Three options: **Park current sale first** · **Discard current sale** · **Cancel**.
>
> When the current sale cannot be saved (see
> [identity requirement](./08-edge-cases.md#no-customer-identity-configured)), the first
> option is **disabled with a visible reason** and a link to the setting that fixes it.
> Do not hide the option — a disabled control with an explanation teaches; a missing one
> confuses.

## The discard confirm

Modelled on the existing destructive confirmations: icon, title, body, two large footer
buttons, red confirm.

It **names the sale and shows its total**, so the wrong one cannot be destroyed by muscle
memory. The copy states plainly that it cannot be undone.

## Stock warnings on resume

Two layers, because one is not enough:

1. **In the cart** — affected lines render with the existing out-of-stock treatment
   (dimmed, red left border, badge). This is free: writing fresh availability onto the
   lines makes the existing rendering correct.
2. **A persistent toast** — listing up to three affected lines by name with the actual
   numbers, plus "and N more":
   > *Stock changed since this sale was parked: Chardonnay 2019 — only 1 left (2 in cart).*

Quantities are **never silently reduced**. The cashier agreed a sale with a customer; the
machine's job is to tell them what changed, not to quietly rewrite the order behind their
back. See [Inventory & stock](./06-inventory-and-stock.md).
