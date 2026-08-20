# Role Management

> **Status:** planned, not implemented. This document is the design brief for the
> work; nothing described here exists in the codebase yet.

## Why

The POS has no concept of *who* is operating it, only *whether someone is logged in*.
`src/context/user/` stores a single Medusa `AdminUser` and an `isAuthenticated` flag.
Nothing in `src/` reads a role, an actor type, or a permission claim. Route protection
is authentication-only.

There is currently **no privilege boundary at all**. An on-device manager PIN existed and
was **removed on 2026-08-12** (`0e258de`) — closing the register, reopening a same-day
close, editing register settings and issuing a refund are all open to whoever is standing
at the terminal.

It was removed rather than extended because of what it was, not merely where it lived:

**1. It was a shared secret, not an identity.** A PIN kept on the terminal is learned by
every cashier who watches it typed. It authorizes an action and records nobody.

**2. It leaked across unrelated features.** Reopening the register reused
`requirePinToClose`, and so did the refund flow — a setting named after closing a register
was quietly the authorization primitive for refunding money.

**3. It vanished when the register was off.** `register.enabled` defaults to `false`, and
the PIN field lived inside the `registerEnabled` branch of the preferences form. A store
that never switched on cash reconciliation had an unguarded refund button and no way to
guard it. That was the concrete trigger for this work, and removing the PIN generalised
the hole rather than closing it: **every** install is now in that state.

**4. Medusa stamps
`created_by` on every refund — but with the device's shared admin user, so every refund in
a store is attributed to the same person regardless of who actually pressed the button.
There is no answer to "who approved this refund?"

## Scope

In scope: an identity and permission model for POS operators, a single authorization
primitive that every privileged action goes through, and a step-up ("manager approval")
flow.

Out of scope: changing how the *device* authenticates to Medusa, and any customer-facing
account concept.

---

## Model

### Two distinct authentications

The important structural idea is that the POS has two separate questions to answer, and
today it conflates them:

- **Device authentication** — is this terminal allowed to talk to the backend? Answered
  today by a Medusa admin login whose JWT lives in `.auth.dat`. **Keep this as-is.**
- **Operator identification** — which member of staff is standing at the counter right
  now, and what may they do? **This is new.**

Making every cashier a Medusa admin user was considered and rejected: Medusa v2 has no
RBAC for admin users, so a "cashier" account would still hold full Admin API access, and
provisioning a backend account per shift worker is operationally heavy for a shop floor.

### Staff records

A POS-local staff roster, one record per person:

```ts
type StaffRole = "cashier" | "supervisor" | "manager" | "owner";

type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  pinHash: string;      // PBKDF2; the previous implementation is in 0e258de's parent if useful
  active: boolean;
  createdAt: string;
};
```

**Where these live is the main open decision — see Open Questions.** The two candidates are
store metadata (`metadata.pos.staff`, mirroring how `metadata.pos.payment_methods` already
works, so the roster syncs across terminals) or a POS plugin table (better, but requires
backend work).

### Permissions, not roles, at the call site

Gate on named permissions and let roles be bundles. This is what stops the current problem
recurring — no feature should ever again reach for another feature's boolean.

```ts
type Permission =
  | "refund.create"
  | "order.cancel"
  | "discount.apply"
  | "price.override"
  | "payment.pay_later"
  | "register.open"
  | "register.close"
  | "register.reopen"
  | "register.movement"
  | "settings.write"
  | "staff.manage";
```

| Permission | Cashier | Supervisor | Manager | Owner |
|---|:--:|:--:|:--:|:--:|
| `register.open` / `register.movement` | ✓ | ✓ | ✓ | ✓ |
| `payment.pay_later` | — | ✓ | ✓ | ✓ |
| `discount.apply` | — | ✓ | ✓ | ✓ |
| `refund.create` | — | ✓ | ✓ | ✓ |
| `register.close` | — | ✓ | ✓ | ✓ |
| `order.cancel` | — | — | ✓ | ✓ |
| `price.override` | — | — | ✓ | ✓ |
| `register.reopen` | — | — | ✓ | ✓ |
| `settings.write` | — | — | ✓ | ✓ |
| `staff.manage` | — | — | — | ✓ |

The bundles should be a plain data table (`ROLE_PERMISSIONS: Record<StaffRole, Permission[]>`),
editable per store later without touching call sites.

### The authorization primitive

One hook, used everywhere:

```ts
const { can, authorize } = useAuthorization();

can("refund.create");                 // boolean — for showing/hiding UI
await authorize("refund.create");     // resolves with the approving staff member, or null
```

`authorize` is the step-up path: if the active operator already holds the permission it
resolves immediately; otherwise it opens a shared `<AuthorizationDialog>` asking a
sufficiently-privileged staff member for their PIN, and resolves with *that* person's
record. This is the real retail requirement — a cashier starts a refund and a supervisor
walks over and approves it — and it is what the removed per-dialog PIN field was a crude
stand-in for.

Every privileged action returns the approver so it can be recorded.

### Audit

Each authorized action records `{ permission, staffId, staffName, role, at }`. For refunds
specifically, put the approver in the refund `note` and/or `metadata` so the record survives
in Medusa rather than only on the terminal — Medusa's own `created_by` will keep pointing at
the shared device account and cannot be relied on.

### Honest limitation

Client-side permission checks are an **operational control, not a security boundary**.
Anyone who can reach the device's stored admin token can call the Medusa Admin API directly
and bypass every check described here. Enforcing roles as real security requires
backend-side checks in a POS plugin (see the standing `medusa-plugin-pos` work) with
per-operator credentials. This plan deliberately builds the operational control first,
structured so a backend enforcement layer can slot in behind the same `useAuthorization`
surface without touching call sites.

---

## There is nothing to migrate from

The manager PIN and everything under it — the PBKDF2 hashing, the legacy unsalted-SHA-256
upgrade path, `verifyManagerPin`, `requirePinToClose`, `managerPinHash`, the settings UI
and the lock over register preferences — was deleted in `0e258de`. A `managerPinHash` may
still sit in `pos-storage.json` on an install that predates that commit; nothing reads it,
and it should not be revived as a seed. Staff records start empty.

The four call sites that used to carry their own `pinRequired` logic are already stripped
and are the ones to wire onto `authorize()`:

- `close-register-dialog/hooks.ts` — closing the register
- `register-menu-item/index.tsx` — reopening a same-day close
- `order/refund-dialog/hooks.ts` — issuing a refund
- `settings/preferences` — editing register configuration

**Interim risk, and it is live now.** Every one of those actions is unauthenticated on
every install, not just on stores with the register disabled. That is a deliberate,
recorded trade — see `docs/pos-toolkit-and-handoff-status.md` §2.4 — made on the basis
that a device-local secret was never real authorization. It does mean this work is the
only thing standing between the current state and an audited one.

---

## Phasing

| Phase | Contents |
|---|---|
| 1 | Types, `ROLE_PERMISSIONS` table, storage, `useAuthorization` with `can()` only. No UI change. |
| 2 | Staff management UI (list, add, edit role, set PIN, deactivate) under Settings. |
| 3 | Shared `<AuthorizationDialog>` + `authorize()` step-up. Migrate refund, register close, register reopen onto it. |
| 4 | Operator sign-in — who is on shift; attribute orders and register sessions to them. |
| 5 | Audit log surface, and backend enforcement via the POS plugin. |

Phases 1–3 restore an authorization boundary, which no longer exists at all. 4–5 are the payoff.

---

## Open questions

1. **Where does the staff roster live?** Store metadata (syncs across terminals for free,
   but it is public-ish data on the store object and a PIN hash sitting there deserves
   scrutiny) versus a POS plugin table (correct, needs backend work). This is the decision
   that blocks Phase 1.
2. **Does an operator "sign in" for a shift, or does every privileged action prompt?**
   Shift sign-in gives real attribution on every order; per-action prompting is less
   intrusive but attributes nothing. A middle option is a short-lived session that a PIN
   opens and inactivity closes.
3. **Are role bundles fixed or store-configurable?** Fixed is simpler and enough for v1;
   configurable needs a permission editor UI.
4. **Do we need a break-glass path** for a store that loses every manager PIN, and what
   stops that path being the bypass?
5. **Per-terminal or per-store roles?** A stockroom terminal and a counter terminal may
   warrant different defaults.

## Related

- `../cash-reconciliation/07-security-manager-pin.md` — the existing PIN design this
  supersedes.
- Refund flow — `src/components/order/refund-dialog/`, the first consumer that exposed the
  coupling.
