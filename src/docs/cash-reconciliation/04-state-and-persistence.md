# 4. State & persistence

## State machine

```
        ┌────────────┐  open(float)   ┌──────────┐  close(count,[pin])  ┌──────────┐
        │ NO SESSION │ ─────────────► │   OPEN   │ ───────────────────► │  CLOSED  │
        └────────────┘                └──────────┘                      └──────────┘
              ▲                          │     ▲                              │
              │                          │     │ addMovement(drop|payin)      │
              │   archive + clear        │     └──────────────────────────────┘
              └──────────────────────────┴──── new business day / reopen ─────┘
```

- **NO SESSION → OPEN**: cashier enters the opening float.
- **OPEN → OPEN**: drops / pay-ins append to `movements`; expected cash recomputes.
- **OPEN → CLOSED**: cashier counts the drawer; difference is computed and snapshotted.
- **CLOSED → (archive) → NO SESSION**: on close, the session is appended to the bounded
  history list; the next open starts fresh.
- **Stale open day**: if an OPEN session's `openedAt` business day is before today, the
  cashier must **close (reconcile) it first**, then open today's.

## Where state lives

State is held in a **React context** (`RegisterProvider` / `useRegister`) — deliberately
**not** a new global store — and persisted through the app's typed storage wrapper.

| Key | Shape | Purpose |
|---|---|---|
| `register_session` | `RegisterSession \| null` | the current (open or just-closed) session |
| `closed_register_sessions` | `RegisterSession[]` (bounded) | append-only history |

### Persistence rules

- **Logout preserves** both keys — a shift survives a cashier logging out and another
  logging in on the same terminal.
- **Backend URL change wipes** both keys — pointing the terminal at a different backend
  is a clean-slate operation.
- **Missing / corrupt storage** is treated as "no open register" → the safe path is to
  show the open prompt, never to assume an open drawer.

## Loading at boot

On mount (and on `visibilitychange`, to catch a day rollover while the app was
backgrounded) the provider reads `register_session`, compares its business day to now,
and sets `needsOpenRegister` accordingly. This is the only place that decides whether the
blocking open dialog appears.

> **React note:** the context value is memoized so consumers don't re-render on unrelated
> updates, and the open-dialog decision is derived from state (not mirrored into a second
> piece of state). Boolean status is named for what it *is* (`isOpen`, `needsOpenRegister`).
