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

### 1b. Order query: fetch item detail

`src/hooks/queries/useQueryOrder.ts` fetches `*items` and `*summary` but not `items.detail`, which
holds `delivered_quantity`, `return_received_quantity` and `return_dismissed_quantity`. Add
`*items.detail`.

### 1c. Order change runner

`src/hooks/order/useOrderChange.ts` — runs a staged operation as an ordered sequence of steps,
tracks how far it got, and on failure cancels the open change. Returns the confirmed outstanding
amount or throws having applied nothing. Exposes the current step for the dialog's progress text.

Pure step-sequencing logic in `src/utils/pos/order-change/index.ts`, unit-tested.

### 1d. Open-change guard

Before any operation, read the order's changes (`sdk.admin.order.listChanges`, already used
elsewhere) and refuse to start if one is open.

### 1e. Settlement routine — **new, not `processPaymentCollection`**

`src/hooks/order/useSettleOutstanding.ts`. Must not reuse `processPaymentCollection` in
`useOrderProcessing.ts`, which would silently charge nothing — it exits when the order is already
paid, reuses the original payment collection, and charges the whole total. See
[Money](./04-money.md#the-existing-payment-helper-cannot-be-reused-as-is).

It may share the lower-level session/capture/`markAsPaid` fallback, extracted into a helper both use.
**If that extraction touches `processPaymentCollection`, checkout payment is regression-tested before
merging.** It is the path every sale goes through.

### 1f. Refund dialog: accept a locked amount

`src/components/order/refund-dialog/` currently takes only `order` and defaults to the full
refundable balance. Add an optional `amount` prop that prefills and locks the field. Existing callers
pass nothing and are unchanged.

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
