# 2. Domain model

All amounts are in **display units** (e.g. `50.00` = fifty in store currency).

## `ParkedSale`

A sale that has been set aside. It is the same thing as an in-progress sale — the only
difference is that no till currently has it open.

```ts
type ParkedSale = {
  id: string;              // stable identifier, assigned by the backend
  reference: string;       // short human-facing number, e.g. "#1042"
  label?: string;          // operator-chosen name, e.g. "Table 4"
  parkedAt: string;        // ISO timestamp of the last save
  customer?: {
    id?: string;
    email?: string;
    name?: string;
  };
  items: SaleLine[];
  orderDiscount?: Discount;  // sale-level discount
  orderComment?: string;     // sale-level note
  total: number;
  currencyCode: string;
};
```

### Field semantics

- **`label`** is a *name*, not a status marker. `reference` means nothing to a cashier
  under time pressure; "Table 4" means everything. It is the primary column in the list
  and the primary thing a cashier searches by.
- **`parkedAt`** is the **last modified** time, not the first-parked time. A sale parked,
  resumed, and re-parked shows the most recent action, which is what "how stale is this?"
  actually asks.
- **`customer`** is optional. Most retail sales are anonymous.
- **`total`** is a snapshot for display in the list. It is re-derived from the lines on
  resume; never treat the stored total as authoritative for payment.

## `SaleLine`

```ts
type SaleLine = {
  variantId: string;
  quantity: number;
  unitPrice: number;       // the price actually charged, after any manual discount
  title: string;
  metadata: SaleLineMetadata;  // see the item-metadata contract
};
```

Lines are **keyed by variant**. One variant appears at most once per sale; adding it again
increments the quantity. This is a POS-wide rule, not specific to parking, but it matters
here because it makes the park/resume diff trivially stable.

`metadata` is where the interesting state lives — the original price before a manual
discount, the variant options, per-line comments, and the availability snapshot. Its
contract is strict enough to deserve its own section:
[Item-metadata contract](./04-state-and-persistence.md#the-item-metadata-contract).

## Why there is no `parked` flag

It would be natural to model this as `Sale { status: "active" | "parked" }`. Don't.

A sale is **parked exactly when no till has it open**, and "which till has what open" is
local, volatile state that no backend flag can track honestly. A persisted flag would go
stale the instant a terminal crashed with a sale open, and there is no reliable moment to
clear it.

Instead, derive it:

> A sale that still exists, and is not the cart currently open on **this** till, is parked.

The list therefore needs no filter, and there is no flag to get out of sync. The one
consequence is that the sale open on the current till *does* appear in its own parked
list — which is correct, and is surfaced as an "Active here" badge rather than hidden.

### Backend mapping (Medusa)

> `ParkedSale` maps onto a **draft order**. `id` → `id`, `reference` → `display_id`,
> `parkedAt` → `updated_at`, `label` → `metadata.park_label`, `items` → `items`.
>
> The invariant holds because `convertToOrder` **consumes** the draft (a paid sale leaves
> no draft behind) and clearing the cart **deletes** it. Listing parked sales is therefore
> an unfiltered `draftOrder.list({ sales_channel_id })`.
>
> This is fortunate, because Medusa's draft-order list route supports **no metadata
> filter and no status filter** — a flag-based model could not have been queried
> server-side anyway. See [Portability](./09-portability.md#what-is-medusa-specific).
