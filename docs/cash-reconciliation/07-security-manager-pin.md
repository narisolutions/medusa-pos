# 7. Security: manager PIN

## What the PIN is

An optional gate on **closing** a register. When `requirePinToClose` is on, the cashier
must enter a manager PIN to finalize a close. The PIN is stored as a **SHA-256 hash**
(`managerPinHash`) — the raw PIN is never persisted.

```
hashPin(raw)            -> hex SHA-256 digest        (Web Crypto: crypto.subtle.digest)
verifyPin(raw, hash)    -> boolean (constant intent comparison)
```

## What the PIN is NOT

> **Important honesty about the threat model.** A hashed, on-device PIN is an **interim,
> single-terminal stopgap**. It is **device control, not server-enforced authorization**.
> Anyone who can modify local storage or the app binary can bypass it.

The intended end-state is **roles enforced by the backend**, where "can close a register"
is a server-checked permission tied to an authenticated staff identity. That work is
deliberately **out of scope for v1** and tracked separately. The PIN exists only so that
closing isn't wide open in the meantime.

## Why it still helps

- It stops a casual cashier from closing/short-changing without a manager present.
- Combined with the **required reason over threshold** and the **immutable closed
  record**, it raises the effort needed to hide a discrepancy.

## Anti-fraud properties (v1, best-effort)

- **Required reason** when `|over/short| > threshold`.
- **Snapshot at close** — `expectedCash` is frozen, so a recorded difference can't be
  silently recomputed away.
- **Archive before reopen** — a closed session is appended to history *before* a new one
  opens, so reopening can't erase a recorded over/short.

These are deterrents, not guarantees. Treat real authorization as a backend concern.

## Portability

`hashPin`/`verifyPin` use the standard Web Crypto API and carry **no app-specific
dependencies** — they move to any other POS unchanged. The *policy* (require PIN to
close) is config; the *enforcement strength* is the same caveat everywhere until a
backend owns roles.
