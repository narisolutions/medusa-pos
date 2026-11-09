# 9. Portability — reusing this in a non-Medusa restaurant POS

This feature was designed to be **mostly backend-agnostic**. The domain model, business-
day logic, expected-cash math, state machine, and UI flows are all generic.
Only a handful of seams touch this app's specific stack (Tauri + React + Medusa). To port
the feature, reimplement those seams and keep everything else.

## Generic (copy as-is)

| Piece | Notes |
|---|---|
| `RegisterSession` / `CashMovement` types | Pure data. No backend types involved. |
| `businessDay(ts, cutoffHour)` | Pure function. |
| `computeExpectedCash(session, sales)` | Pure function over a normalized sale list (see seam below). |
| State machine (NO SESSION → OPEN → CLOSED → archive) | Framework-independent logic. |
| Dialog flows & validation rules | Re-skin the UI; keep the rules. |
| The **enabled / off-by-default** policy | Same everywhere. |

## Seams to reimplement (backend-specific)

### 1. Tender type of a sale — "is this cash?"

This app uses `getOrderPaymentMethodType(order, store) -> "cash" | "card"`, which reads
Medusa's payment collections. A restaurant POS replaces this with **its own** mapping
from a check/ticket's payments to a cash amount. The clean contract is:

```ts
// Normalize whatever your backend returns into this shape, then feed the list
// to computeExpectedCash — it never sees a Medusa (or any) order directly.
type SessionSale = {
  id: string;
  cashAmount: number;   // cash portion only (0 for fully-card sales)
  refunded?: boolean;   // or a refund amount, if you support partial refunds
  cancelled?: boolean;  // excluded from totals
  at: string;           // ISO; used for the time-window fallback
};
```

Keeping `computeExpectedCash` operating on `SessionSale[]` (not on raw orders) is the key
to portability: only the **adapter** that builds `SessionSale[]` is backend-specific.

### 2. Fetching the session's sales

This app uses a Medusa-backed query hook (`useQuerySessionOrders`) plus a
`register_session_id` stamp in order metadata, with a `created_at >= openedAt` fallback.
A different POS swaps in its own data source — a local SQLite ticket table, a REST call,
etc. The two attribution strategies (stamped id, then time window) are worth keeping.

### 3. Persistence

This app uses a typed Tauri Store wrapper. Any key/value store works. The only
requirements:

- two slots: current session + bounded history list;
- **preserve on logout**, **wipe on backend switch** (or your equivalent of changing
  which venue/data source the terminal points at);
- ambiguity → "no open register".

### 4. Printing the close summary

This app uses `usePrinterService().printReceiptText(text)`. Replace with the target POS's
printer abstraction. The summary is plain text; the format in
[UI flows](./05-ui-flows.md) is a starting template.

## Suggested module boundary for reuse

```
core/                 (portable — no backend imports)
  register.types.ts       RegisterSession, CashMovement, SessionSale
  business-day.ts         businessDay()
  expected-cash.ts        computeExpectedCash(session, SessionSale[])
  session-machine.ts      pure transitions: open / addMovement / close / archive

adapters/             (per-app — the only files you rewrite)
  sales-source.ts         build SessionSale[] from your backend
  storage.ts              load/save session + history
  printer.ts              printCloseSummary(text)
```

The X/Z adds `report.ts` to `core/`: a pure function from the session and its
normalized sales to a `SessionReport`. `SessionSale` then needs per-tender amounts and a
refund split, not only `cashAmount`.

Port `core/` verbatim; write fresh `adapters/`. Everything in
[domain model](./02-domain-model.md) through [edge cases](./08-edge-cases.md) describes
the `core/` behavior and applies unchanged.

## Phase 2: sessions on the backend

*A later decision, not scheduled.* Phase 1 keeps everything on the till. Moving it to
the backend gives a store-wide session book, totals that don't depend on downloading
orders ([KL-2](../known-limitations.md#kl-2-expected-cash-reads-at-most-1000-orders-per-session)),
and a base for the 2028 universal cash register.

Medusa has **no** built-in register, shift, cash or report feature; its POS guidance
covers draft orders, sales channels and stock locations and leaves the rest to custom
modules. The fit is Medusa's own pattern, in the POS plugin:

- **A custom module** with data models `register_session`, `cash_movement` and
  `z_snapshot`, each storing the ids it is filtered by (till, store, business day).
- **Module links** from session to order, rather than order metadata.
- **Workflows** for open, movement and close, each taking a lock (`acquireLockStep`) on
  the till so two devices cannot close the same session.
- **Totals by SQL** in the module service. `query.graph` has no SUM or GROUP BY, and
  raw SQL in a module service is the documented way to aggregate.
- **Routes** under the plugin's POS routes, plus an Admin widget for the session book.

Not used, and why:

- **Index module** — experimental, and built for filtering across modules, not
  aggregating.
- **Analytics module** — event tracking to an external service, not a ledger.

The till keeps the same `core/`: the sales adapter is replaced by one call that returns
the session's totals.
