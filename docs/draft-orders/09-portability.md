# 9. Portability — reusing this in a non-Medusa POS

Park & resume is almost entirely generic. The concept, the state machine, the UI flows,
and the stock-reconciliation logic carry unchanged to any POS. What is stack-specific is
narrow: **where a parked sale is stored**, and the quirks of the API storing it.

## Generic (copy as-is)

| Piece | Notes |
|---|---|
| `ParkedSale` / `SaleLine` types | Pure data, no backend types |
| The single-active-cart invariant | The core architectural idea |
| State machine (EMPTY → UNBOUND → BOUND → parked / order) | Framework-independent |
| `adopt` / `release` as **atomic** operations | The correctness requirement, everywhere |
| Dirty-cart resume chooser (empty / bound / unbound) | Re-skin the UI; keep the three cases |
| `reconcileStock(lines, availability) → ok / reduced / unavailable` | Pure function |
| "Never silently clamp quantities" | A product principle, not an implementation detail |
| The item-metadata contract | Applies to any serialize/deserialize round trip |
| Rows are not clickable; explicit action buttons only | Touchscreen safety, universal |

## Seams to reimplement

### 1. Parked-sale storage

This app stores parked sales as **backend draft orders**. That is the single biggest
stack-specific decision, and it is not the only option:

| Approach | Gains | Costs |
|---|---|---|
| Backend draft/pending sale *(this app)* | Cross-terminal, survives device loss | Needs a backend that models unfinished sales; network-dependent |
| Local database (SQLite) | Fast, offline | Single-terminal; lost with the device |
| Local + background sync | Both | Conflict resolution you must build |

A restaurant POS with a local ticket table would use the second, and most of these docs
still apply — a "held check" is a parked sale.

The contract the rest of the feature needs:

```ts
type ParkedSaleStore = {
  list(scope): Promise<ParkedSale[]>;
  load(id): Promise<ParkedSale | null>;   // null = gone, not an error
  save(sale): Promise<string>;            // create or update; returns id
  remove(id): Promise<void>;              // deleting a missing sale is success
};
```

Keeping the feature on this interface — never on raw backend types — is what makes the
rest portable.

### 2. Deriving "parked"

This app derives it from an invariant: a sale that still exists is unfinished, because
completing one consumes it. **Check whether that holds in the target system.** A backend
that keeps a completed sale's draft around needs an explicit status field instead — in
which case revisit [Domain model](./02-domain-model.md#why-there-is-no-parked-flag), whose
argument against a flag assumes the invariant.

### 3. Availability lookup

`reconcileStock` takes a plain `Map<variantId, number>`. Build it however the target POS
knows about stock. Only the adapter changes.

### 4. Local persistence

The active cart lives in a typed key-value store. Any store works. Requirements: persist
on every mutation; **preserve on logout**; **wipe when the terminal is repointed at a
different data source**.

### 5. Identity requirement

This app cannot create a sale without an email. Most POS backends have no such
requirement — if the target does not, delete the guard and the disabled-option handling in
the resume chooser along with it.

## What is Medusa-specific

- **A draft order is the storage medium.** Completing one consumes it; clearing the cart
  deletes it. This is what makes the core invariant true.
- **Saving is an edit transaction** — open, diff, confirm. It can be left pending if
  interrupted, which is why [Edge cases](./08-edge-cases.md#the-sale-is-stuck-mid-edit)
  exists.
- **The list route filters by id, search, region, customer, sales channel, and dates —
  but not by metadata or status.** Any flag-based scheme would have had to be filtered
  client-side. Check this before assuming a filter exists.
- **A sale requires an email or a customer id.**
- **Conversion creates its own inventory reservations**, which is the entire reason
  [Phase 2](./07-reservations-phase-2.md) is delicate.

## What is Tauri / React-specific

- The active cart is persisted through a Tauri key-value store.
- Cart state is a Zustand store split into slices; `adopt` and `release` are single
  actions there specifically so the persistence middleware writes **once**, atomically.
  In another framework the requirement is the same — one indivisible write — even though
  the mechanism differs.

## Suggested module boundary

```
core/                    (portable — no backend imports)
  parked-sale.types.ts      ParkedSale, SaleLine, SaleLineMetadata
  sale-machine.ts           adopt / release / park / resume / discard transitions
  reconcile-stock.ts        reconcileStock(lines, availability)
  metadata.ts               round-trip mapping + the contract test

adapters/                (per-app — the only files you rewrite)
  parked-sale-store.ts      list / load / save / remove
  availability.ts           build Map<variantId, number>
  cart-persistence.ts       local cart load/save
```

Port `core/` verbatim; write fresh `adapters/`. Documents 2 through 8 describe `core/`
behaviour and apply unchanged.
