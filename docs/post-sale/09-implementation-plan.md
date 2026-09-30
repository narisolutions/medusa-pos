# 9. Implementation plan

> This document is **project-specific** — it names this repository's files, and is the
> execution plan for the concepts in documents 1–8.

## Sequencing: charges → returns → exchanges

| Order | Feature | Why here |
|---|---|---|
| 1 | **Additional charges** | Smallest. Independent. Exercises the settlement routine every other feature needs, with the least around it. |
| 2 | **Returns** | The most common counter operation, and a hard dependency of exchanges. |
| 3 | **Exchanges** | An exchange owns a return and receives through it. Building exchanges first means building returns anyway, without shipping them. |

Each feature is a separate, releasable increment. The roadmap entry is only marked released
once all three are.

---

## Phase 0 — Verification spike

**No production code.** Every behaviour below is marked *verify in spike* in the concept docs.
The Medusa documentation does not state them, and code built on a wrong guess fails silently.

Run against **staging**, from a throwaway script calling the admin SDK directly, on a real
order that has been paid, fulfilled and delivered through the POS.

| # | Question | Decides |
|---|---|---|
| S1 | Sign of `summary.pending_difference` after (a) a charge, (b) a return | Every settlement branch |
| S2 | Does confirming an edit or exchange **create a payment collection** for the difference? | Whether the settlement routine creates one or finds one |
| S3 | `payment_status` of a paid order after a charge raises the total | Whether existing `payment_status` checks start misreporting |
| S4 | Can `receiveItems` and `dismissItems` be mixed on one return, for split quantities of one line? | Whether a line can be split restock/damaged |
| S5 | Fulfilment state the backend requires before accepting a return; does a POS pickup fulfilment qualify? | Eligibility rules |
| S6 | Does the backend reject a second open change on an order, or allow it? | Whether the open-change guard is POS-only |
| S7 | Which payment states can `payment.refund` refund against; can one refund span several payments? | The *nothing to refund against* edge case |
| S8 | Exact formula for returnable quantity from `items.detail` | The return quantity caps |
| S9 | Does `exchange.request` fail without outbound shipping, and does the store's pickup option satisfy it? | Exchange sequence |

**Exit criterion:** every row answered in writing, appended to this document. The concept docs
are corrected wherever an answer contradicts them, **before** Phase 1 begins.

### Spike results — 2026-09-30

Run against staging (`@medusajs/js-sdk` 2.19.0) on POS orders #509 (charge, then return and
refunds), #510 and #507 (exchanges), and #517 (eligibility). All are cash sales with a pickup
fulfilment.

| # | Answer |
|---|---|
| S1 | **Positive = the customer owes.** A charge of 10 gave `pending_difference` **+10**; a return of 10 gave **−10**. For a return it turns negative at `confirmRequest`, before anything is received. |
| S2 | **Yes, the backend creates one.** Confirming an edit and requesting an exchange each created a new `not_paid` payment collection for exactly the difference. The settlement routine **finds** it; it does not create one. `paymentCollection.markAsPaid` with `provider_id` settles it. |
| S3 | **`partially_captured`** once an edit raises the total, back to `captured` when settled. `fulfillment_status` likewise drops to `partially_delivered` until the added items are fulfilled. A return that leaves money owed does **not** change `payment_status`; it stays `captured`. |
| S4 | **Yes.** On a line of 2, `receiveItems` 1 + `dismissItems` 1 confirmed together: `return_received_quantity` 1, `return_dismissed_quantity` 1, `written_off_quantity` 1. |
| S5 | **Fulfilled is enough; delivered is not required.** A return of an unfulfilled line is rejected ("more items than what was fulfilled"); a fulfilled but undelivered line is accepted. A POS pickup fulfilment qualifies. |
| S6 | **The backend rejects it.** A second `initiateRequest` of any type while a change is open fails with 400 "already has an existing active order change". The POS guard is still needed to give a readable reason, but it is backed by the backend. |
| S7 | **Only captured payments, one payment per refund.** Each `payment.refund` is capped at that payment's captured amount (an uncaptured payment refunds nothing), so a refund larger than one payment must be split across payments by the POS. ⚠ The backend does **not** cap a refund at what is owed: refunding 1 beyond `pending_difference` was accepted and silently became a **credit line**, lowering the order total. The POS must cap the refund at −`pending_difference`. |
| S8 | **The POS must compute it; the backend's cap is not enough.** The backend only rejects quantities above `fulfilled_quantity − return_requested_quantity`, so an already-received line was accepted into a second return. Returnable = `fulfilled_quantity − return_requested_quantity − return_received_quantity − return_dismissed_quantity`. |
| S9 | **The request succeeds without outbound shipping, but the outbound items then cannot be fulfilled**: no stock reservation is created ("No stock reservation found"). Adding the store's **pickup** shipping option makes the request reserve stock, and fulfilment then works. Outbound shipping is therefore required in practice. |

Also found:

- **Previews do not show the settled figure.** Before `request`/`confirmRequest`, the preview's
  `pending_difference` was 0 for a return and 8.99 for an exchange that settled at 3.99 (the
  inbound credit is missing). The running difference must be computed locally, as
  [UI flows](./06-ui-flows.md#the-running-difference) already says, and the backend figure read
  after the request step.
- **`exchange.create` rejects `no_notification`** (400 "Unrecognized fields"). The return,
  fulfilment and receive calls accept it.
- **Lines added by an edit or exchange get the product title only** (`Amber Vale · Saperavi`
  instead of `… 750ml`), which changes how they read on receipts and the order page.

---

## Phase 1 — Shared foundation

Built once, used by all three features.

### 1a. Extract the product picker from checkout

The search, barcode and variant chooser are coupled to checkout in two ways:

- `checkout/filter/index.tsx` and `checkout/cart-items/variant-dialog/index.tsx` read `currency`
  from `useCheckout()`, which only exists inside `CheckoutProvider`. The order page is outside it.
- `checkout/filter/hooks.ts` calls `useCartStore.addItem` **directly** (two call sites). Reused
  as-is, scanning a bottle during an exchange would add it to whatever sale is open on the till.

**Change:** lift the picker into `src/components/base/product-picker/` taking `currency` and
`onSelect(variant, quantity)` as props. Checkout passes a callback that calls `addItem`, so its
behaviour is unchanged. Scanner hooks (`useSerialScanner`, `useBarcodeBackgroundPaste`) move with
it — they are currently mounted only in the checkout filter, which is correct and must stay true:
one mounted picker per route.

This is a **refactor of working checkout code** and ships on its own, with no user-visible change,
before anything depends on it.

✅ **Done 2026-09-30.** The picker is `base/product-picker/` with its variant dialog inside it; the
cart list imports that dialog and passes `currency`. `onSelect(variant)` returns
`{ success, message? }` and the picker turns that into the toast and sound. The planned `quantity`
argument was left out: every caller adds one, and the exchange list adjusts quantities itself.

### 1b. Order query: fetch item detail

`src/hooks/queries/useQueryOrder.ts` fetches `*items` and `*summary` but not `items.detail`, which
holds `delivered_quantity`, `return_received_quantity` and `return_dismissed_quantity`. Add
`*items.detail`.

✅ **Done 2026-09-30**, checked against staging order #509.

### 1c. Order change runner

`src/hooks/order/useOrderChange.ts` — runs a staged operation as an ordered sequence of steps,
tracks how far it got, and on failure cancels the open change. Returns the confirmed outstanding
amount or throws having applied nothing. Exposes the current step for the dialog's progress text.

Pure step-sequencing logic in `src/utils/pos/order-change/index.ts`, unit-tested.

✅ **Done 2026-09-30.** Each step registers an undo; failures undo newest first, and a step can
replace earlier undos (`return.cancel` supersedes `cancelRequest`). Outcomes are *applied*,
*rolled back* or *stranded* (the undo failed too). The rollback calls per operation are in
[Order changes](./03-order-changes.md#the-rule-a-change-is-either-fully-applied-or-fully-discarded),
checked on staging order #492, which was left unchanged.

### 1d. Open-change guard

Before any operation, read the order's changes (`sdk.admin.order.listChanges`, already used
elsewhere) and refuse to start if one is open.

✅ **Done 2026-09-30.** `useOrderChange.run` checks first and throws `OrderChangeBlockedError`;
`getOpenOrderChange` is exported so the entry point can show the reason before a dialog opens.

### 1e. Settlement routine — **new, not `processPaymentCollection`**

`src/hooks/order/useSettleOutstanding.ts`. Must not reuse `processPaymentCollection` in
`useOrderProcessing.ts`, which would silently charge nothing — it exits when the order is already
paid, reuses the original payment collection, and charges the whole total. See
[Money](./04-money.md#the-existing-payment-helper-cannot-be-reused-as-is).

It may share the lower-level session/capture/`markAsPaid` fallback, extracted into a helper both use.
**If that extraction touches `processPaymentCollection`, checkout payment is regression-tested before
merging.** It is the path every sale goes through.

✅ **Done 2026-09-30.** `settleOutstanding` (in `utils/pos/order-processing`) reads
`pending_difference`, finds the `not_paid` collection the backend created for exactly that amount
(spike S2), and pays it through `settleCollection` — the session/capture/`markAsPaid` path lifted
out of `processPaymentCollection` unchanged. Checked on staging order #492 with cash and card: each
recorded a new captured payment for the difference only.

✅ **Done 2026-09-30.** `settleOutstanding` in `src/utils/pos/order-processing/` reads
`pending_difference`, finds the `not_paid` collection the backend created for exactly that amount
(spike S2), and pays it through `settleCollection` — the session/capture/`markAsPaid` tail extracted
unchanged from `processPaymentCollection`. Checked on staging order #492 with `pp_cash_pos` and
`pp_tbc_pos`: each charged 5, the provider was recorded, and the order returned to `captured`.

### 1f. Refund dialog: accept a locked amount

`src/components/order/refund-dialog/` currently takes only `order` and defaults to the full
refundable balance. Add an optional `amount` prop that prefills and locks the field. Existing callers
pass nothing and are unchanged.

✅ **Done 2026-09-30.** With `amount`, the numpad, *Refund full* and the payment picker are hidden,
and the amount is split across payments by `allocateRefund` (largest first), because one refund can
never exceed one payment (spike S7). If the payments cannot cover it, the dialog says how much they
can and refuses. Without `amount` the dialog is unchanged.

### 1g. Entry point and chooser

- `canPostSale` flags in `src/components/order/hooks.ts`, alongside the existing `canRefund` /
  `canRecordPayment`, with a per-option reason when disabled.
- One **Return or exchange** header button in `src/components/order/index.tsx`.
- `src/components/order/post-sale-chooser/` — three stacked `h-14` options.

---

## Phase 2 — Additional charges

- `src/components/order/add-items-dialog/` — product picker + running difference.
- Sequence: `orderEdit.initiateRequest` → `addItems` → `request` → `confirm`, then fulfil the added
  items immediately, then settle.
- All calls with `no_notification: true` where accepted.

## Phase 3 — Returns

- `src/components/order/return-dialog/` — line list with returnable caps, condition per line with **no
  default**, optional reason and note.
- `src/hooks/queries/useQueryReturnReasons.ts` — `sdk.admin.returnReason.list`. Note: the app currently
  queries **refund** reasons, a different resource.
- Requires a configured stock location; disabled with a reason and a settings link when unset.
- Sequence: `return.initiateRequest` (with `location_id`) → `addReturnItem` → `confirmRequest` →
  `initiateReceive` → `receiveItems` / `dismissItems` → `confirmReceive`, then settle.

## Phase 4 — Exchanges

- `src/components/order/exchange-dialog/` — inbound (as return) + outbound (product picker) + running
  difference.
- Sequence: `exchange.create` → `addInboundItems` → `addOutboundItems` → `addOutboundShipping` (pickup
  option) → `request`; then receive the owned return exactly as in Phase 3; fulfil outbound; settle.
- Pickup-option selection reuses the rule `createDraftOrder` already applies.

---

## Cross-cutting, per phase

- **Activity timeline** — `src/components/order/activity/hooks.ts` gains event types for the phase's
  operation. `ActivityEvent["type"]` in `src/types/utils.ts` is extended.
- **Cash reconciliation** — cash in either direction is attributed to the open register session; refused
  while the register is closed.
- **Receipt slip** — what came back, what went out, what was settled.
- **i18n** — all seven locales.
- **Query invalidation** — `queryKeys.orders.detail` and `queryKeys.orders.all` after every operation.

## Testing

**Unit** (pure modules, matching the repo's existing `*.test.ts` convention):
- returnable-quantity calculation, including partly-returned lines
- the change runner: success, failure at each step, cancel-on-failure, cancel-also-fails
- running-difference estimate and direction wording

**Regression, before Phase 1 merges:**
- a normal checkout sale end to end, cash and card — the picker extraction and any settlement-helper
  extraction both touch that path

**Manual per phase, against staging:** the journeys in [Overview](./01-overview.md), plus every entry in
[Edge cases](./07-edge-cases.md). Confirm stock in Medusa Admin after each return — restocked lines up,
damaged lines unchanged — rather than trusting the UI.

## Done means

- All three phases shipped.
- Every spike question answered and the concept docs corrected.
- Returns verified to restock correctly, and damaged lines verified **not** to.
- An additional charge verified to record the payment — checked on the order's payment collections, not
  just by the dialog closing.
- Then, and only then, the roadmap entry is marked released.
