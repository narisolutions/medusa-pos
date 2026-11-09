# Touch UI design system

How this POS draws its screens. The app runs on till touchscreens, used standing, at arm's length, by staff in a hurry,
often in bright light. Every screen is built from the same tokens and components, so it looks and behaves the same
everywhere. Read this before adding or changing UI. Plugin panels should follow it too.

The rules are portable. Only the file paths and class names are specific to this app's stack (React, Tailwind CSS 4,
Radix).

## 1. Principles

1. **Touch first.** Every control is at least 44px, 48px by default. A mouse is a bonus, never assumed: nothing
   depends on hover.
2. **Readable at arm's length.** Body and control text is at least 16px. Money uses tabular figures.
3. **State is never colour alone.** It's always shown as icon + word + colour, e.g. "✓ Paid", "⚠ Not paid", "Offline".
4. **Every tap answers.** Pressed states on everything; a spinner on anything that waits.
5. **Numbers on the keypad.** Amounts and quantities use the shared Numpad or Stepper, not the OS keyboard.
6. **Instant with Undo, confirm only what can't be undone** (see §4).
7. **Scan first.** The scan field keeps focus on Checkout. A scan is acknowledged by sound and a flash on the cart line.
8. **One decisive action per screen or dialog.** It's the largest button, and it states the outcome and the amount
   ("Payment · ₾24.50").
9. **Same piece, same job.** If a component exists for it, use it rather than styling a new one.

## 2. Tokens (`src/globals.css`)

Never use raw palette classes (`bg-red-500`, `text-gray-600`) or hard-coded colours. Store branding (`primary`,
`secondary`) comes from the API at runtime, and dark mode only works through tokens.

**Touch scale.** Sizes are in rem, so the till's Display size scales them with the text.

| Token | Size | Use |
|---|---|---|
| `tap-min` | 44px | the absolute floor (`h-tap-min`) |
| `tap` | 48px | default controls: buttons, inputs, selects, rows |
| `tap-lg` | 56px | everyday sale actions, list rows, Stepper buttons |
| `tap-xl` | 64px | the decisive action of a flow, nav items, tiles |
| `tap-key` | 72px | keypad keys |

Use them as `h-tap`, `min-h-tap-lg`, `size-tap-xl` and so on.

**Colour.**
- **Surfaces and text:** `surface`, `surface-muted`, `surface-subtle`, `fg`, `fg-muted`, `fg-subtle`,
  `theme-border`, `theme-border-strong`.
- **Brand:** `primary` / `primary-foreground` and `secondary`. These are overridden at runtime by the store.
- **Intent:** `success`, `warning`, `danger`, `info`, each in four forms:
  - solid fill (`bg-success`);
  - text on that fill (`text-success-foreground`);
  - tinted background (`bg-success-subtle`);
  - text on a surface (`text-success-text`).

  Every pair meets WCAG AA in light and dark.

**Text.**
- `text-base` (16px) is the minimum for anything read or tapped.
- `text-sm` is only for non-essential metadata, such as the app version.
- `text-amount` is for money in rows and panels; `text-total` is for the sale total and the change due.
- Always add `tabular-nums` to money.

**Motion.** Fades and a 100ms pressed scale only; `prefers-reduced-motion` disables animation.

**Global touch hygiene**, applied once in `globals.css` and `utils/ui/touch-guards.ts`:
- no tap highlight, overscroll bounce or pinch zoom;
- no long-press menu outside text fields;
- no dragging images or links;
- `touch-action: manipulation` on controls.

## 3. Components (`src/components/ui`)

| Need | Use | Notes |
|---|---|---|
| An action | `Button` | Sizes `default` 48 · `lg` 56 · `xl` 64 · `icon` 48 · `icon-lg` 56. Variants include `success` and `destructive`. Use `loading` instead of hand-made spinners |
| A large action or choice in a grid | `Tile` | Icon, label and a live `subline` (e.g. "−₾5.00", a customer name). `selected` = fill + ✓ |
| One choice out of 2–5, all visible | `SegmentedControl` | Light/Dark, ₾/%, Cash out/Cash in. The selected one is filled, bold and ticked |
| One choice out of many | `ChooserDialog` + `ChooserTrigger` | Full-width rows, groups, the current one ticked, search above 12 options. Not a narrow dropdown |
| A quantity | `Stepper` | 56px − / +, hold to repeat. Always pass real `min`/`max`; the parent may clamp too |
| An amount or a typed number | `Numpad` | `maxDecimals={2}` for money, `replace` to type over a prefilled value, `enterDisabled` while invalid |
| A status | `StatusChip` | Intent + icon + word. Order, payment and fulfilment use `base/order-status-chip` |
| A row that opens something | `ListRow` | 56px+, the whole row is the target, chevron when it navigates |
| Loading / nothing / failed | `LoadingState`, `EmptyState`, `ErrorState` | Always with words. Empty says what to do next; Error offers Retry |
| A dialog | `Dialog` | Fade only. Titles keep clear of the 48px close button. `DialogFooter sticky` pins actions while content scrolls |
| A text field | `Input` | 48px and 16px always. `clearable` adds a 48px × |
| A switch / checkbox | `Switch`, `Checkbox` | Large hit areas beyond the visible control |
| A settings form's Save | `settings/save-bar` | Pinned and flagged only while there are unsaved changes. Use `useUnsavedChanges(form)`, not `formState.isDirty` |

Development builds have a live catalogue of all of these at `/dev/ui` (Settings → UI kit). Use it to check components
on the real touchscreen.

## 4. Patterns

**Confirm or Undo.**

| Action | Pattern |
|---|---|
| Remove a cart line, clear the cart | Instant, with an **Undo** toast |
| Change a quantity, park a sale | Instant, no prompt, no toast |
| Pay, refund, return, exchange, discard a parked sale, close the register, log out | A short confirmation with the amount and a large decisive button |
| Change the backend URL, restart for an update | A confirmation that names the consequence |

**Scan feedback.**
- A successful scan or quick key: a short beep and a brief flash on the cart line, scrolled into view. No toast.
- A failed scan: a double low buzz and an inline banner under the search field ("No product with barcode …", Retry).

**Money and numbers.**
- The decisive button shows the amount.
- The total is never hidden during a sale.
- Over/short, change and amount-short use intent colour plus a word and an icon.

**Lists and states.** Every list or panel designs four states: loading, empty, error (Retry), and data.

**Dialogs.**
- The decisive action goes bottom or right and is the largest; Cancel goes furthest from it.
- Long dialogs get a sticky footer, or two columns (details | keypad) so they fit one screen.

**Settings.**
- Each section is its own route (`/settings/:section`), so it survives a reload and opens at the top.
- Labels sit above fields.

**Per-till preferences.**
- **Display size** (Compact / Standard / Large) scales the root font, and with it every rem-based size.
- **Sounds** can be switched on or off per event: item scanned, scan failed, sale completed, error.

**Copy.**
- Buttons are verbs.
- Every string is in all 7 locales (`src/i18n/locales`). Check Georgian for overflow: it runs longer.

## 5. Rules in CI

`yarn check:ui` (`scripts/check-ui-rules.mjs`) counts these in `src/components`:
- `text-xs`;
- heights under 44px (`h-8/9/10`, `min-h-8/9/10`);
- raw palette colours.

It also fails outright on a token class with no theme key in `globals.css` (e.g. `text-fg-mutted`) and on
Tailwind 3's `bg-[--var]` syntax: Tailwind 4 drops both silently, leaving the element unstyled.

The counts in `scripts/ui-rules-baseline.json` may only go down. New code can't add violations. After fixing some, run
`yarn check:ui --update` to lock the improvement in. A justified exception, such as a decorative 32px switch track
inside a 48px hit area, is recorded the same way.

## 6. Checklist for a UI change

- [ ] Only tokens; no raw colours. No text under 16px on anything read or tapped. No target under 44px.
- [ ] Every control has a pressed state; nothing depends on hover.
- [ ] State shown as icon + word, not colour alone.
- [ ] Loading, empty and error states are designed.
- [ ] Numbers entered on the Numpad or Stepper.
- [ ] Strings in all 7 locales.
- [ ] Checked on the touchscreen (or `/dev/ui`) in light and dark, in English and Georgian.
- [ ] `yarn typecheck`, `yarn lint`, `yarn test`, `yarn check:ui` pass.
