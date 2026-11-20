# Customer display

A second screen facing the buyer that shows the sale as it is rung up: each item, any savings, the
total, the amount due and, for cash, what was handed over and the change. It is read-only: the
customer never taps it. Its window is created so that it cannot take focus, and if the operating
system focuses it anyway, the till takes focus straight back.

**Status:** v1 built (unreleased). The same till PC drives a display-only monitor (HDMI, VGA or
USB-C) that the operating system sees as a second screen.

## Concepts

### Screens
| Screen | When | Shows |
|---|---|---|
| Welcome | Empty cart, after "thank you", or when the till has gone quiet | The store's logo from Store settings (or its name), a short brand-colour rule, and a welcome line |
| Cart | Items in the cart | Lines, newest at the bottom and scrolled into view; the changed line flashes. Item count, subtotal and "you save" when there is a saving, and the total. "Prices include VAT" under it only when the store is known to charge VAT |
| Payment | The payment dialog is open | The cart as it was when payment began, dimmed. One big amount: what is due now (the total it was rounded from only when cash rounding changed it). Cash: paid and change (or still due) as the cashier types. Card: "follow the terminal". Bank transfer: "details on your bill". The VAT amount once the backend has priced the sale, and no VAT line when it charged none, as on the till's own payment screen |
| Thank you | A sale completed | Total and change for cash; "payment due later" for pay later. Held for the configured time (5–30 s), and ended for good by the next scan |
| Not completed | Payment failed, or was kept as an unpaid order | Held 6 s, then back to the payment still open, or the cart |

### Rules
- **One way.** The till tells the display; the display never sends data back. Its only message is
  "hello" when it opens, answered with the current screen.
- **Whole screens, not changes.** Each message carries everything the screen needs, so a missed one is
  healed by the next, and a display that just opened needs one message.
- **Allowlist.** Lines are built field by field: title, option values, quantity, prices, a discount
  label, and a photo URL (https only). SKUs, barcodes, stock, internal comments, customer, staff,
  register and park data never leave the till. Every screen is checked against the contract before
  it is sent, and only the fields the contract names go out.
- **The till's own figures.** Subtotal, saving, total and item count come from the same getters the
  till's cart reads; the amount due, VAT and change come from the payment screen. The display does
  no sums of its own, so the two screens cannot disagree.
- **A screen that breaks the contract is never sent, and never silently dropped.** The till logs why
  (and throws in development and tests); the display logs any screen it refuses, once per reason.
- **VAT is said only when known.** The till reads the store's tax rate once after sign-in: the
  default rate of the tax region of the store's country. Above zero, the cart screen says "prices
  include VAT". A zero rate, no tax region, a rate still loading and a rate that could not be read all
  show no VAT line. The payment screen shows the VAT amount the backend charged, when above zero.
- **Quantities need not be whole.** A weighed item is 0.35; the contract takes any positive number.
- **Ordering and liveness.** Every message has a version (`v: 1`) and a sequence number that only goes
  up during one run of the till. The display ignores an older number, except 1, which means the till
  restarted. The till resends every 5 s; after 15 s of silence the display shows the welcome screen,
  never old prices.
- **Throttled.** A burst of scans sends one screen (at most every 100 ms), so the till never slows.
- **Long carts.** The newest 50 lines are shown, with "earlier items: N". The totals count every line.

## Settings (per till)
Settings → Customer display: on/off (off by default), which monitor, language (same as the till,
Georgian, English, or Georgian with English underneath), product photos, and how long "thank you"
stays. A live preview uses the same view as the real screen, in the store's currency and with the VAT
note only where the real screen would show it. Settings save at once.

## Portability notes
- **Generic:** the message contract (`src/utils/schemas/customer-display.ts`), the mapper from cart to
  screen (`src/utils/customer-display/map.ts`), the publisher (`publisher.ts`), the receiver rules
  (`receive.ts`) and the view (`src/components/customer-display/view`). None of them import Tauri.
- **Transport-specific:** `transport.ts` sends over Tauri events (`cds://state`, `cds://hello`). A LAN
  tablet or a dual-screen Android terminal would add another transport and keep everything else.
- **Window (Tauri, Rust):** `src-tauri/src/customer_display.rs` lists monitors, opens the window
  fullscreen on the chosen one as a window that cannot take focus (a keyboard-wedge scanner types into
  whichever window has focus), and closes it when that monitor is unplugged. The till checks every
  5 s, so a replugged monitor gets its display back, and until that check runs the operating system
  may briefly show the window on the remaining screen. It never opens while the till's own monitor is
  unknown, and it closes with the till's window, so quitting leaves nothing behind. It uses the main
  window's browser arguments, read from the app config: WebView2 refuses a second webview in the same
  data directory with different ones.
- **Permissions.** The window is created in Rust, so the frontend needs no permission to create or
  move windows. Its capability (`capabilities/customer-display.json`) allows only events and logging,
  which covers Tauri's core and plugin commands (no storage, HTTP or files). The app's own commands
  (printing, the cash drawer, the backend address) are not governed by capabilities, so the command
  handler refuses every one of them when the call comes from the display's window.
- **Boot.** The entry file reads the window's label and loads either the till or the display, each
  its own chunk: the cart, the backend client and their storage never start in the display's window.
- **Backend-specific:** the VAT rate comes from Medusa's tax regions (`useQueryVatRate`, cached like the
  region and read again after a backend change); the VAT amount on the payment screen comes from the
  priced draft order (`tax_total`). Another backend supplies a rate and an amount; the rule
  (`src/utils/customer-display/vat.ts`) stays.

## A touch-capable customer screen
The display ignores touch, but the operating system decides which screen a touch panel belongs to. If
a tap on the customer's screen clicks something on the till, the panel is mapped to the wrong monitor;
fix it in the system, not the app:
- **Windows:** Control Panel → Hardware and Sound → Tablet PC Settings → Setup… → Touch input, then
  tap the customer's screen when asked.
- **Ubuntu (GNOME):** set the panel's output with
  `gsettings set org.gnome.desktop.peripherals.touchscreen:/org/gnome/desktop/peripherals/touchscreens/<VID>:<PID>/ output "['<vendor>', '<product>', '<serial>']"`,
  where VID:PID come from `/proc/bus/input/devices` and the monitor's vendor, product and serial from
  `org.gnome.Mutter.DisplayConfig.GetCurrentState`.

The store's logo travels with the welcome screen only (up to about 300 KB), never with each scan.

## Known limitations
- **Linux on Wayland** lets the compositor place windows, so the display may not open on the chosen
  monitor there. Windows and Linux on X11 place it.
- The order page's own flows (returns, exchanges, adding items, Record payment) don't use the cart, so
  the display shows the welcome screen during them.
- Not in v1: promotional slides, receipt QR or email capture, loyalty sign-up.

## Hardware check
On the Windows till with the customer monitor connected:
1. Settings → Customer display → turn on, choose the monitor → the display opens and fills that screen; the till keeps focus. If it stays blank or doesn't open, look for "Customer display did not open" in the log.
2. Scan 5 items fast → the display shows them within a moment; the till doesn't lag.
3. Add a line discount → the old price is struck through and "you save" appears.
4. Cash payment, type 50 → paid and change update live.
5. Complete → "thank you" with the change, then the welcome screen after the set time.
6. Card payment → "follow the terminal", then "thank you".
7. Pay later → "payment due later".
8. Park the sale → welcome screen. Resume → the cart is back.
9. Unplug the customer monitor mid-sale → the till screen is not covered. Plug it back → the display returns within 5 s.
10. Quit and reopen the app → the display opens again after sign-in, with the cart.
11. Tap the customer monitor (if it's a touchscreen), then scan → nothing happens on the till, and the item lands in the till's cart. If the tap clicks something on the till, map the touch panel to the customer's monitor (see "A touch-capable customer screen").
12. Language "Georgian + English" → both languages on every label, ₾ formatted as on the till.
13. Alt+F4 the till while signed in → the display closes too, and no Medusa POS process is left running.
14. Put the PC to sleep and wake it; switch the customer monitor off and on → the display is back within 5 s, never on the till's screen.
15. Set Windows scaling to 125% or 150% on one monitor only → the display still fills the customer's screen.
16. Sign in with the customer monitor unplugged, then connect it → the display opens within 5 s.
17. Reboot the PC → the same monitor is still chosen.
18. Complete a sale, then scan an item and remove it within the thank-you time → the welcome screen, not "thank you" again.
19. With the language set to Georgian, open the display → Georgian from the first screen, with no English flash.
20. Switch the till between light and dark → the display follows at once.
21. With items in the cart, use Record payment on another order → note what the customer sees (the cart stays up).
22. Scan a barcode while the payment dialog is open → note whether the till adds it, and what the display shows.
23. Alt-Tab during a burst of scans → every scan lands in the till's cart.
24. Ring up more than 50 lines → the newest 50 show, with "earlier items", and the totals match the till.
25. Turn on cash rounding → amount due and change match the till's payment screen.
26. Sell a product whose photo fails to load → the placeholder shows; nothing else changes.
27. With the store's tax region at 18%, ring up items → "Prices include VAT" under the total. Set the default rate to 0, or delete the tax region, in Medusa admin, then sign out and in → no VAT line on the cart screen. Until the rate has loaded after sign-in, the line is absent.
