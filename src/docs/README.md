# POS Documentation

This directory holds **portable, product-agnostic** documentation for POS features.
It is written so that the concepts and logic can be reused in a **different POS
application** — for example a restaurant POS that does **not** use a Medusa backend.

Each feature lives in its own subdirectory. Within a feature, docs are split into:

- **Concept docs** — the domain, rules, and flows, written independent of any
  particular backend or framework.
- **Portability notes** — what is generic vs. what is specific to this app's stack
  (Tauri + React + Medusa), and how to swap the specific parts out.

## Conventions

- Money is documented in **display units** (e.g. `50.00` = fifty in store currency),
  not minor units, unless a doc says otherwise.
- "Backend-specific" call-outs mark anything tied to Medusa; everything else is
  intended to be reusable.

## Features

| Feature | Status | Docs |
|---|---|---|
| [Cash Reconciliation](./cash-reconciliation/README.md) | v1 (in development) | Register open/close, expected-cash tracking, discrepancy reporting |

> More feature subdirectories will be added here over time.
</invoke>
