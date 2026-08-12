# 1. Overview

## What ships in v1

A daily open/close register flow for a **single terminal**, fully local.

1. **Open register** — on the first launch of each business day, a blocking dialog asks
   for the starting cash (the *float*). Checkout is **hard-gated** until the register is
   open. (Gate applies only when the feature is enabled — see
   [Settings & configuration](./06-settings-and-configuration.md).)
2. **During the shift** — every **cash** sale adds to the expected drawer total
   automatically. Cash **refunds subtract**. Mid-shift **cash drops** (cash removed to a
   safe) and **pay-ins** (change added) adjust the expected total.
3. **Close register** — the operator counts the drawer and enters **one total**. The app
   shows `Expected vs Counted vs Over/Short`. A **reason is required** when the
   difference exceeds a configurable threshold. Closing can require a **manager PIN**.
4. **Optional** — print a short close summary on the existing receipt printer (this is a
   summary, not a full Z-Report).

## The cashier's journey

```
app start ──► [business day changed or no open session?]
                 │ yes                          │ no
                 ▼                               ▼
        OpenRegisterDialog (blocking)     register already open ─► normal POS
                 │ enters float
                 ▼
        register OPEN ──► sales allowed ──► cash sales raise "expected"
                 │                          pay-in/drop adjust "expected"
                 │                          cash refund lowers "expected"
                 ▼
        CloseRegisterDialog ──► count drawer ──► Over/Short shown
                 │ (reason if over threshold, manager PIN if required)
                 ▼
        session archived to history ──► next open starts a fresh day
```

## In scope (v1)

- Single terminal, offline-capable.
- Cash-only drawer math (card totals are out of scope for v1 reconciliation).
- Cash drops / pay-ins.
- Configurable business-day cut-off (default midnight).
- Single-total counting (no denomination breakdown yet).
- Minimal local history of closed sessions (no in-app browsing UI yet).
- Optional close-summary print.

## Out of scope (deferred)

- Z-Report (short/long) and end-of-day accounting across **all** payment methods.
- In-app history browser, PDF/CSV export.
- Denomination ("count by note") breakdown.
- **Server-enforced staff roles** — v1 uses an interim on-device manager PIN; proper
  roles are a later, backend-side concern. See [Security](./07-security-manager-pin.md).
