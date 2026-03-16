<p align="center">
  <img src="public/logo.png" alt="Medusa POS Logo" width="220" />
</p>

# Medusa POS

[![CI](https://github.com/narisolutions/medusa-pos/actions/workflows/release.yml/badge.svg)](https://github.com/narisolutions/medusa-pos/actions/workflows/release.yml)
[![GitHub Release](https://img.shields.io/github/v/release/narisolutions/medusa-pos)](https://github.com/narisolutions/medusa-pos/releases/latest)
[![License](https://img.shields.io/github/license/narisolutions/medusa-pos)](LICENSE)

Cross-platform POS app for Medusa built with React + Tauri 2.

> This project is under active development. APIs, behavior, and UX may change.

Medusa POS is an independent open-source project and is not officially affiliated with Medusa.

## Compatibility

| Capability | Vanilla Medusa (`admin.product.list`) | Medusa + POS plugin/custom `/pos` endpoints |
|---|---|---|
| Add product to cart | ✅ | ✅ |
| Reliable inventory check before adding | ❌ (variant `inventory_quantity` may be missing) | ✅ |
| Context-aware computed variant price | ❌ (raw prices array) | ✅ |
| Inventory kit availability checks | ❌ | ✅ |

## Medusa Version Tested

- Frontend SDK/types in this project: `@medusajs/js-sdk@2.13.3`, `@medusajs/types@2.13.3`
- App behavior validated against Medusa Admin API v2.13.x style responses.

If your backend is older/newer, behavior can differ (especially pricing and inventory fields).

## Quick Start

### Prerequisites

- Node.js 18+
- Rust (stable)
- Yarn
- Tauri prerequisites for your OS: [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/)

### Install

```bash
yarn install
```

### Run

```bash
# Browser (UI-only)
yarn dev

# Desktop (recommended)
yarn tauri dev
```

### Build / Lint

```bash
yarn build
yarn lint
yarn typecheck
```

## Core Features

- Checkout UI with barcode scanning, cart, payment dialog
- Draft order creation and updates through Medusa Admin APIs
- Receipt printing (network / USB / Bluetooth), cash drawer trigger
- Order list and order detail views
- Settings for API/store, printers, branding, preferences
- Multi-store backend configuration

## Environment

Use `.env`, `.env.staging`, or `.env.production`:

```env
VITE_BACKEND_URL=https://your-medusa-instance.example.com/
```

The backend URL can also be configured at runtime via Store Setup.

## Known Medusa API Limitations (Observed)

### 1) Draft Order discount totals do not reflect Sale Price List reductions

**What happens**

- Variant pricing can be returned with `calculated_amount < original_amount` (sale price list applied).
- Draft order `discount_total` and line-item discount totals stay `0` unless a Promotion is explicitly applied.
- There is no documented Admin Draft Order option to treat `original_amount - calculated_amount` as discount totals.

**Expected**

- `line_item.item_discount_total = (original_amount - calculated_amount) * quantity`
- `order.discount_total = sum(item_discount_totals)`
- Works without requiring Promotion objects when sale pricing is already applied.

### 2) Admin Payment Collection creation cannot attach payments/provider data

**What happens**

- `sdk.admin.paymentCollection.create(...)` does not accept `payments[]`, `provider_id`, or `provider_data` in `AdminCreatePaymentCollection`.
- This prevents representing payment provider details (for example POS cash provider metadata) directly at creation time through Admin API flow.

**Expected**

- Admin API should allow creating a payment collection with one or more payments, including:
  - `provider_id`
  - `provider_data`
  - payment amounts and references

## Useful Links

- [Contributing](CONTRIBUTING.md)
- [Discussions](https://github.com/narisolutions/medusa-pos/discussions)
- [Issues](https://github.com/narisolutions/medusa-pos/issues)
- [Security](SECURITY.md)
- [License](LICENSE)
