# 6. Settings & configuration

Cash reconciliation is **optional** and ships **disabled by default**. All configuration
lives in **Settings → Preferences → Register** and is stored per-terminal in user
preferences (not on the backend).

## The configuration object

```ts
type RegisterPreferences = {
  enabled: boolean;            // master switch — DEFAULT false
  dayCutoffHour: number;       // 0–23, business-day boundary; DEFAULT 0 (midnight)
  discrepancyThreshold: number;// |over/short| above this requires a reason; DEFAULT 5.00
  requirePinToClose: boolean;  // gate close behind manager PIN; DEFAULT true
  managerPinHash?: string;     // SHA-256 hash of the manager PIN (never the raw PIN)
};
```

## The master toggle (`enabled`)

This is the most important control and the one feature added on top of the original plan.

- **Default `false`.** A fresh install behaves exactly as before — no gate, no dialogs,
  no sidebar status.
- When **off**, every register surface is dormant:
  - the checkout open-modal gate does nothing;
  - `needsOpenRegister` is never set, so the blocking dialog never shows;
  - the sidebar `RegisterMenuItem` renders nothing.
- When the operator turns it **on**, the register config fields become visible and the
  open-register flow begins on the next checkout / app start.

> **Implementation rule:** every register entry point must short-circuit on
> `enabled === false` *before* doing any work, so enabling/disabling is a true no-op
> toggle with no residual behavior.

## The other options (only meaningful when enabled)

| Option | Effect | Default |
|---|---|---|
| `dayCutoffHour` | When the business day rolls over (see [Business day](./03-business-day-and-expected-cash.md)) | `0` |
| `discrepancyThreshold` | Over/short magnitude that forces a reason at close | `5.00` |
| `requirePinToClose` | Whether closing requires the manager PIN | `true` |
| `managerPinHash` | Set/changed via a sub-flow; stored hashed only | unset |

The config fields are only rendered when `enabled` is true, to keep the settings panel
clean for stores that don't use the feature.
