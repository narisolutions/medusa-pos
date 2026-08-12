# 9. Portability — reusing this in a non-Medusa restaurant POS

This feature was designed to be **mostly backend-agnostic**. The domain model, business-
day logic, expected-cash math, state machine, PIN hashing, and UI flows are all generic.
Only a handful of seams touch this app's specific stack (Tauri + React + Medusa). To port
the feature, reimplement those seams and keep everything else.

## Generic (copy as-is)

| Piece | Notes |
|---|---|
| `RegisterSession` / `CashMovement` types | Pure data. No backend types involved. |
| `businessDay(ts, cutoffHour)` | Pure function. |
| `computeExpectedCash(session, sales)` | Pure function over a normalized sale list (see seam below). |
| `hashPin` / `verifyPin` | Standard Web Crypto (`crypto.subtle`) — works in any modern runtime. |
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
  pin.ts                  hashPin / verifyPin
  session-machine.ts      pure transitions: open / addMovement / close / archive

adapters/             (per-app — the only files you rewrite)
  sales-source.ts         build SessionSale[] from your backend
  storage.ts              load/save session + history
  printer.ts              printCloseSummary(text)
```

Port `core/` verbatim; write fresh `adapters/`. Everything in
[domain model](./02-domain-model.md) through [edge cases](./08-edge-cases.md) describes
the `core/` behavior and applies unchanged.
