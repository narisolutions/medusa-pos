# Cash Reconciliation

A daily **open register → track expected cash → close register → record over/short**
flow for a **single terminal**, fully local (no backend required for v1).

This feature is **optional**. It is **disabled by default** and must be turned on in
**Settings → Preferences → Register**. While disabled, none of the gates, dialogs, or
sidebar status appear and the POS behaves exactly as it did before the feature existed.

## Why it exists

Operators otherwise have no way to verify that the physical cash in the drawer matches
the cash the system thinks was taken. This feature gives each shift a known starting
float, a counted closing total, and a recorded **over/short** difference.

## Document index

| # | Document | What it covers |
|---|---|---|
| 1 | [Overview](./01-overview.md) | What ships in v1, the cashier's journey, scope boundaries |
| 2 | [Domain model](./02-domain-model.md) | `RegisterSession`, `CashMovement`, and field semantics |
| 3 | [Business day & expected cash](./03-business-day-and-expected-cash.md) | Cut-off logic and the expected-cash formula |
| 4 | [State & persistence](./04-state-and-persistence.md) | The session state machine and where it is stored |
| 5 | [UI flows](./05-ui-flows.md) | Open / movement / close dialogs and the sidebar status |
| 6 | [Settings & configuration](./06-settings-and-configuration.md) | The enable toggle and per-terminal options |
| 7 | [Security: manager PIN](./07-security-manager-pin.md) | The interim on-device PIN and its end-state |
| 8 | [Edge cases](./08-edge-cases.md) | Restarts, stale days, refunds, fraud, corrupt storage |
| 9 | [Portability](./09-portability.md) | Reusing this in a non-Medusa restaurant POS |

## Core formula

```
expected cash = opening float
              + cash sales
              - cash refunds
              + pay-ins
              - cash drops
```

Split payments count the **cash portion only**; cancelled/voided sales are excluded.
