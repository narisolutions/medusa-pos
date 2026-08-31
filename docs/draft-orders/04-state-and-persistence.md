# 4. State & persistence

## Where each piece lives

| State | Home | Survives restart? | Shared across tills? |
|---|---|---|---|
| The parked sales themselves | Backend | ✅ | ✅ |
| The active cart (lines, bound id, metadata) | Local key-value store | ✅ | ❌ |
| Selected payment method | Local cart only | ✅ | ❌ |
| Which row is selected in the cart UI | Memory | ❌ | ❌ |
| List filters / search text | Local key-value store | ✅ | ❌ |

The backend is the **only** source of truth for parked sales. The terminal keeps no local
index of them, deliberately: a local index would go stale the moment another till resumed
or paid one, and reconciling it would be a permanent source of bugs. The list is always a
live query.

## The active cart is persisted

The whole cart — bound id, lines, and sale-level metadata — is written locally on every
mutation, so a crash or restart mid-sale loses nothing. It is **preserved on logout** (the
sale belongs to the till, not the cashier) and **wiped when the terminal is pointed at a
different backend**.

## What is local-only

**Payment method** never leaves the terminal. It is the cashier's selection on *this*
till, and the till that resumes a parked sale may not offer the same methods. On resume it
resets and is re-picked.

Everything else round-trips.

## The item-metadata contract

Line metadata is where the non-obvious state lives, and it is the part most likely to be
silently corrupted. A park/resume cycle is a **full serialize/deserialize of the cart**,
so anything not carried is permanently lost — not just visually, but from the eventual
order.

The contract is: **line metadata written locally must come back byte-identical.**

| Key | Purpose | Lost if dropped |
|---|---|---|
| `product_title` | Display name above the variant | Line renders with the wrong label |
| `variant_sku`, `barcode` | Display / scanning | SKU column empties |
| `thumbnail` | Display | Image disappears |
| `options` | Variant options (size, vintage…) | **Options column empties** |
| `available_quantity` | Stock snapshot | Stock warnings stop working |
| `original_price` | Catalogue price before a **price-list** discount | Struck-through price disappears |
| `original_unit_price` | Price before a **manual** discount | **Discount silently becomes the new base price** |
| `priceListType` | Which discount kind applied | Discount breakdown mislabels |
| `item_discount` | The manual per-line discount | Discount vanishes from the receipt |
| `comment` | Per-line note | Note vanishes |
| `inventory_item_ids` | Backing inventory items for kits | Kit handling breaks; blocks Phase 2 |

### Pass metadata through wholesale — do not allowlist it

The obvious implementation is to map known keys explicitly. **Don't.** An allowlist here
must be updated in lockstep with the *writer* of the metadata, which lives in a different
module, and it fails **silently** when it drifts — the data simply is not there, with no
error.

This is not hypothetical: the original implementation allowlisted twelve keys and had
already lost `options`, `original_unit_price`, and `inventory_item_ids` without anyone
noticing, because nothing exercised the round trip.

Copy the whole metadata object. All of it is written by this application; there is no
untrusted writer. If filtering ever becomes genuinely necessary, use a **denylist** —
subtractive, fails open, and cannot silently eat data it has never heard of.

> **Test this.** A round-trip regression test asserting that every key above survives
> `build → save → load` is the only thing standing between this contract and its slow
> erosion. It lives beside the mapping code in `src/utils/pos/draft-order/`.

### `available_quantity` is the exception

It must be **overwritten** on load, never trusted from storage. It is a snapshot taken
when the item was added, and after a park it may be days old. Carrying it through
unchanged would make the stock warnings confidently wrong, which is worse than having
none. See [Inventory & stock](./06-inventory-and-stock.md).

## Sale-level metadata must preserve unknown keys

Sale-level metadata carries POS-owned keys (label, sale discount, sale comment) alongside
keys written by **other** parts of the app at payment time — cash tendered, register
session id, pay-later markers.

Anything that writes sale metadata must therefore **merge**, not replace. Rebuilding the
object from a fixed set of known keys destroys everything else on it. Because parking
multiplies the number of times a sale is saved, a replace-style write that was previously
harmless becomes a reliable way to erase payment state.

Normalize the keys you own; pass through the ones you do not.
