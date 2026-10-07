# pos-toolkit adoption & Brindola QR hand-off — what is still open

*Last updated 2026-10-07.*

Everything below is known-outstanding work, deliberate omissions, or defects found and not yet fixed. What is already done and merged is summarised only enough to make the gaps legible.

## Shipped and merged

| | Workstream | Commit |
|---|---|---|
| A | In-tree Rust hardware layer replaced by `tauri-plugin-pos-hardware` | `fdfae58` |
| B | `PrintOp::QrCode` + `TextRow` + `onUnmapped` upstreamed to pos-toolkit | pos-toolkit `d9c78da` |
| C | Transfer payment type, QR payload builder, ticket printing | `8ba64f6`, `7c3c033`, `3538b8b`, `264e9d9` |
| D | Serial (Virtual COM) barcode scanners | `53cafb5` |
| E | Receipts built by pos-toolkit's `receipt-builder`, `translit` default | `a3c7943` |

---

## 1. Blocked on other people

### 1.1 Backend: the internal-transfer settlement does not exist

The POS needs **a stable payment provider id** (e.g. `pp_transfer_pos`) registered in Medusa that completes an order immediately without customer payment. That is the only hard contract the POS requires; inventory decrement, per-period reconciliation (`sum of payments by provider_id`) and per-order traceability all follow from it for free.

Until it exists, the transfer flow is simulated by setting an existing payment method's **Type** to `transfer` in Settings → Store, which makes the POS behave correctly while Medusa still settles under the borrowed provider.

⚠ If `markAsPaid` fails with the configured provider, [useOrderProcessing.ts](../src/hooks/order/useOrderProcessing.ts) silently retries under `pp_system_default`. A misconfigured provider therefore does **not** visibly break a sale — the order completes but drops out of reconciliation totals. Verify the provider is actually being used, not merely that the sale went through.

### 1.2 Catalogue: wines are not age-tagged, so the age check never fires

`minimumAge` is read from the line item's `product_type`, matching `restriction:(\d+)\+`. No product currently carries it, so **every ticket ships unrestricted** and the restaurant till never raises its age prompt.

Wine is the motivating case for that entire feature on Brindola's side. This is a data gap, not a code defect: either tag the wines `restriction:18+`, or tell us the convention actually in use and the parser in [handoff/index.ts](../src/utils/pos/handoff/index.ts) will be matched to it.

**This should be closed before the feature goes live.**

---

## 2. Open product decisions

### 2.1 `nameKa` — Georgian names on the restaurant bill

Omitted from the payload. Medusa's titles here are English and there is no Georgian source. The field is optional and Brindola falls back to `name`, so this is a valid v1 — but Georgian receipts at the restaurant will show English wine names.

Candidates: a `metadata.name_ka` on the variant/product, a Medusa translation module, or accepting the fallback.

### 2.2 Transfer counterparty — one, or several?

`transfer_counterparty` is stored in store metadata and printed on the ticket. ✅ It is now a single text field in Settings → Store, shown once a payment method's type is `transfer`. If more than one counterparty is ever needed, that field becomes a picker per counterparty.

The hand-off brief anticipates more than one eventually (another restaurant, a bar) but says a single hardcoded one unblocks the first location.

### 2.3 Should transfer settlement be role-gated?

The brief suggests yes. Not implemented, and it depends on the role-management work described below.

### 2.4 Staff roles — the register is now ungated

The on-device manager PIN was removed (2026-08-12). It gated closing the register, reopening a
same-day close, and editing register settings; all three are now open to any operator.

A PIN held on the terminal is a shared secret rather than an identity — every cashier learns it,
and it proves nothing about *who* closed the drawer. Authority is to be **server-enforced staff
roles in Medusa**, and until those exist the register has no preventive gate at all. What remains
is evidential: the expected total is snapshotted and immutable, a reason is forced over the
discrepancy threshold, and a voided close stays on record.

Whoever implements Medusa roles should also revisit §2.3 — transfer settlement, closing and
reopening are the three actions that want the same gate.

---

## 3. Known defects, not fixed

### 3.1 ~~Receipts printed at checkout show the wrong currency~~ — fixed

✅ `currency_code` is now in all three `fields` strings in [payment-dialog/hooks.ts](../src/components/checkout/payment-dialog/hooks.ts). Kept for the record:

The order fetched immediately after checkout does not request `currency_code`, so `getOrderCurrency` falls back to the hardcoded `USD` in [constants](../src/utils/constants/index.ts). A ₾3.00 sale prints `3.00 USD`. Reprinting the same order from the order page is correct, because that path does request the field.

**Fix:** add `currency_code` to the three `fields` strings in [payment-dialog/hooks.ts](../src/components/checkout/payment-dialog/hooks.ts). Pre-existing, not introduced by this work, but customer-facing and about money.

### 3.2 ~~`getMethodType` matches provider ids case-sensitively~~ — fixed

✅ It now lowercases both sides, like its sibling. Kept for the record:

Its sibling `getOrderPaymentMethodLabel` matches case-**in**sensitively. A configured id differing only in case therefore shows the right label on a receipt while silently resolving to type `card` — wrong drawer behaviour, no transfer ticket, no visible error.

### 3.3 ~~The Icon and Type dropdowns are indistinguishable~~ — fixed

✅ The payment-method rows now have column headers: *Button icon* and *Processed as*. Kept for the record:

Adjacent, identical options, no column headers. Setting Icon instead of Type produces a silent no-op that costs a test cycle to diagnose — it already did once. They need labels.

Related, ✅ fixed: `getMethodType` now infers from `icon` for `transfer` as well as `cash`, so `icon: "transfer"` with no `type` no longer reads as `card`.

### 3.4 ~~Network cash-drawer kick rejects hostnames~~ — fixed

✅ Fixed upstream in pos-toolkit `8b2b802` and pinned here. The bug was wider than described below: network printing and status queries rejected hostnames too, because escpos only accepts an IP literal once a timeout is set. Hostnames are now resolved once, IPv4 first. Kept for the record:

`open_cash_drawer`'s network path parses the address with `SocketAddr::parse`, so `192.168.1.50` works and `printer.local` fails — while printing to the same hostname works fine. Lives upstream in pos-toolkit; worth an issue there.

### 3.5 The test page lost underline and reverse video

`PrintOp::Text` carries bold, alignment and size only. Cosmetic, test page only, but a visible change to anyone who knows that page.

### ~~3.6 An order-level discount would not reach the ticket~~ — removed

✅ No screen ever set an order-level discount, so the unreachable code behind it was removed
(2026-10-07): `setOrderDiscount`, `order_discount` metadata handling and the receipt/summary lines.
If order-level discounts are ever wanted, build them so they reach Medusa's totals (promotions, or
spread over the line prices) — and therefore the ticket's per-line `priceMinor` too.

### ~~3.7 Minor units assume two decimals~~ — fixed

✅ `toMinorUnits` now uses the currency's ISO 4217 decimals from `Intl` (`currencyExponent`: GEL 2,
JPY 0, KWD 3; 2 when unknown), as the brief asks. Kept for the record: it multiplied by 100, which
was right for GEL only.

### ~~3.8 The bill showed the product without its size or vintage~~ — fixed

✅ The payload's `name` (and the ticket's item line) now append the line's `variant_title` —
"Saperavi, 750ml / 2020" — unless it is Medusa's "Default variant" or already in the title, as
the brief asks for what matters (producer, vintage). Before, a bottle went over as "Saperavi".

---

## 4. ~~Follow-ups now unblocked in pos-toolkit~~ — applied

pos-toolkit `d9c78da` added two things specifically to undo compromises made in workstream E:

- **`TextRow`** — `Payment Method` was moved into the receipt's meta block because `MoneyRow` carries an amount and no text. It can move back next to Amount Paid where it belongs.
- **`onUnmapped`** — the cp852 "unmapped character" warning was lost when `buildReceiptText` took over sanitising. It can be re-wired to the logger.

✅ Both are applied: Payment Method is a `TextRow` above Amount Paid again, and unmapped characters are logged once per receipt as a single warning.

Also worth upstreaming eventually: an **`align` field on `PrintOp::QrCode`**. Centring the hand-off QR currently uses raw `ESC a` bytes around the op, which is what `Raw` is for but is less tidy than the op carrying its own alignment.

---

## 5. Verification gaps

The QR hand-off ticket is **confirmed working end to end** against a real printer and a real Brindola till (2026-08-12).

Still to confirm — check with whoever ran the hardware pass before trusting any of these:

- **A multi-item ticket (3–4 bottles).** Only single-item tickets have been scanned. The QR module size is now derived from payload length, so a longer ticket produces a denser code; this is the case most likely to fail, and the item count is the useful diagnostic if it does.
- **Windows print spooler and keyboard detection.** Windows-only code that does not compile on Linux, so it has never been built here.
- **USB printer transport**, and the drawer kick on each of the three transports.
- **Georgian romanization on a real receipt.** The `translit` encoding is now the default, but the test catalogue has no Georgian product names, so it has never been printed. Create one to test it.

---

## 6. The payload contract moves — check it before touching it

The QR payload is owned by **Brindola's `docs/22-external-items-qr.md`**, mirrored into `docs/handoffs/medusa-qr-hand-off.md`. It has already changed once under us, on 2026-08-10:

- `priceTetri` → **`priceMinor`** (the payload carries its own ISO 4217 `currency`, so naming the field after Georgia's minor unit was wrong)
- the base64url **URL form** became the one to print — `https://<host>/brindola/handoff/v1?d=…` — because a keyboard wedge cannot be assumed to carry non-ASCII, and `nameKa` would be at risk
- a new optional **`prepArea`** (kitchen routing). We do not emit it; a bottle needs no kitchen ticket. It would matter if a deli counter ever transferred something that needs finishing.

Tickets built to the old contract are **rejected on scan** with "That code carries an amount this terminal cannot charge exactly" — their parser finds no price at all.

It changed again on 2026-09-16, when Tamada was renamed **Brindola**: the printed path is now `/brindola/handoff/v1`. The recognizer still accepts `/tamada/handoff/` so paper printed before the rename keeps scanning, but it is never generated.

⚠ Read that doc on Brindola's **`origin/develop`**. It is hundreds of commits ahead of `main`, and a stale local clone will show the old contract with no indication that it is out of date.
