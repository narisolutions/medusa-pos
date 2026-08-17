# POS Documentation

This directory holds two kinds of document, kept apart on purpose:

- **Feature docs** (subdirectories) — **portable and product-agnostic**, written so the
  concepts and logic can be reused in a **different POS application**, for example a
  restaurant POS that does **not** use a Medusa backend.
- **Project docs** (files at this level) — the opposite: specific to *this* deployment,
  naming our branches, backends and open work. They date quickly, and that is fine.

## Feature docs

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
| [Role Management](./role-management/README.md) | planned, not implemented | Operator identity, permissions and manager approval — the authorization boundary the POS currently lacks entirely |
| [Role Management](./role-management/README.md) | planned (design only) | Staff roles, permissions, manager approval — replaces the register-scoped manager PIN |

> More feature subdirectories will be added here over time.

## Project docs

| Doc | What it covers |
|---|---|
| [pos-toolkit & QR hand-off status](./pos-toolkit-and-handoff-status.md) | What is still open on the pos-toolkit adoption and the Tamada transfer ticket: work blocked on other teams, open decisions, known defects, and verification gaps |
