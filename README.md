<p align="center">
  <img src="public/logo.png" alt="Medusa POS Logo" width="220" />
</p>

# Medusa POS

[![CI](https://github.com/narisolutions/medusa-pos/actions/workflows/release.yml/badge.svg)](https://github.com/narisolutions/medusa-pos/actions/workflows/release.yml)
[![GitHub Release](https://img.shields.io/github/v/release/narisolutions/medusa-pos)](https://github.com/narisolutions/medusa-pos/releases/latest)
[![License](https://img.shields.io/github/license/narisolutions/medusa-pos)](LICENSE)
[![GitHub Discussions](https://img.shields.io/github/discussions/narisolutions/medusa-pos)](https://github.com/narisolutions/medusa-pos/discussions)
[![GitHub Issues](https://img.shields.io/github/issues/narisolutions/medusa-pos)](https://github.com/narisolutions/medusa-pos/issues)
[![GitHub Stars](https://img.shields.io/github/stars/narisolutions/medusa-pos)](https://github.com/narisolutions/medusa-pos/stargazers)

A cross-platform Point of Sale application built on [Medusa](https://medusajs.com/) and [Tauri 2](https://tauri.app/). Runs as a native desktop application on Linux, macOS, and Windows, with Android APK support via Tauri Mobile.

Designed for retail environments that already use Medusa as their e-commerce backend. The app connects directly to your Medusa instance, draws product and inventory data from it, and pushes completed orders back as draft orders — keeping your storefront and physical register in sync without any middleware.

---

## Features

### Point of Sale
- Three-column checkout interface: product browser, cart, payment
- Real-time inventory validation — blocks overselling at the cart level
- Barcode scanning support (paste-event based, hardware scanner compatible)
- Configurable quick cash amount buttons
- Order comments and per-item or order-level discounts (percent or fixed amount)
- Customer assignment to orders
- Receipt printing to network, USB, or Bluetooth thermal printers
- Cash drawer trigger via ESC/POS pin-2 command

### Orders
- Paginated order list with filter by status, date range, and payment status
- Full order detail view including line items, customer info, fulfillment, and activity log
- Inline fulfillment dialog

### Settings
- Printer configuration (name, connection type, IP/port, default flag)
- API and sales channel selection
- Company branding: store name, brand name, logo, address, phone, primary/secondary colors, font size
- Payment method configuration

### Platform and Deployment
- Multi-store support: configure per-store backend URLs and switch active store at login
- Runtime theme: primary and secondary colors applied as CSS variables from the API
- Two-tier storage clear: separate behavior for logout (preserves printers, theme, stores) vs. backend URL change (full reset)
- Auto-update pipeline via Tauri updater protocol (update manifest hosted externally)

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Language | TypeScript (strict mode) |
| Desktop shell | Tauri 2 (Rust) |
| Routing | React Router 7 (hash-based) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| Forms | React Hook Form + Zod |
| UI components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS 4 |
| Backend SDK | Medusa JS SDK v2 (custom-patched) |
| Storage | Tauri Store plugin |
| HTTP | Tauri HTTP plugin (replaces `fetch`) |
| Printer protocol | ESC/POS via Rust `escpos` crate |
| Receipts | jsPDF |
| Toasts | Sonner |
| Build tool | Vite |
| Package manager | yarn |

---

## Architecture Overview

### HTTP and SDK

All HTTP requests are routed through Tauri's HTTP plugin — the browser `fetch` API is never used directly. The Medusa JS SDK is patched at initialization to use a custom fetch implementation (`src/config/medusa.ts`) that:

1. Resolves the backend URL from the stored app config
2. Reads the JWT from the Tauri Store (`.auth.dat`), falling back to `localStorage`
3. Injects `Authorization: Bearer <token>` on all non-auth requests
4. Extracts and stores tokens from successful login responses
5. Normalizes URLs and query parameters for Tauri HTTP compatibility

The SDK is a singleton — `initializeSdk()` runs exactly once per session. Calling `resetSdk()` followed by re-initialization handles backend URL changes.

### Backend URL scope (Tauri HTTP)

By default, the Tauri HTTP capability is configured to allow requests to any `https://` URL so that this open-source app can be used with arbitrary Medusa backends. For production deployments, you should tighten this by editing `src-tauri/capabilities/default.json` and replacing the broad `https://**` pattern under the `http:allow-fetch` permission with the specific domains of your own backend(s).

### Authentication Flow

1. On app boot, `useAppInit` checks whether a backend config exists (via Tauri command `check_config_exists`)
2. If no config, the store setup dialog prompts for a backend URL and performs a health check
3. Once configured, the SDK is initialized and the existing session is hydrated via the Medusa admin user endpoint
4. Successful hydration sets `isAuthenticated = true` in the Zustand user store
5. 401 responses anywhere in the app clear auth state and redirect to sign-in
6. Multi-store: each store can have its own backend URL, stored and retrieved by store ID

### State Management

- **Auth/User** — Zustand store (`src/context/user/index.ts`). Holds `admin`, `isAuthenticated`, `globalLoading`.
- **Cart** — Zustand store split into five slices (`src/context/cart/slices/`): items, metadata, calculations, sync, and storage. A persistence middleware wraps all mutations to invalidate sync state and save to `pos-storage.json` via Tauri Store.
- **Server data** — TanStack Query. Default: `staleTime` 4 minutes, `gcTime` 30 minutes, no retries.
- **Theme** — CSS variables (`--primary`, `--secondary`) set at runtime from company settings fetched via the API.

### Cart and Discount System

Cart items are typed as `AdminAddDraftOrderItem`. Each item stores metadata (product title, SKU, barcode, thumbnail, available quantity, price list info).

Discounts operate at two levels:
- **Item level**: manual percent or fixed-amount discount applied to `unit_price`; `original_unit_price` is preserved for reference
- **Order level**: percent or fixed discount applied to the subtotal after item discounts
- **Backend discounts**: detected when `original_price !== unit_price` (price list applied upstream)

The calculations slice (`src/context/cart/slices/calculations.slice.ts`) exposes `getDiscountBreakdown()` which separates backend discounts, item discounts, and order discounts into a structured object.

### Printer Integration

Printer communication runs entirely in the Rust layer (`src-tauri/src/lib.rs`):
- Network printers: TCP connection to configured IP:port (default `9100`), 5-second timeout
- USB: direct device path write
- ESC/POS commands via the `escpos` crate
- Unicode text supported (UTF-8 encoded)
- Logo images stored in `$APPLOCALDATA` and loaded for receipt header

### Versioning

The app version in `package.json` (referenced by `tauri.conf.json`) is the single source of truth. `vite.config.ts` additionally reads git tags matching `v*.*.*` and injects the latest semver into `import.meta.env.VITE_APP_VERSION` for display in the UI.

---

## Project Structure

```
src/
├── assets/           Static assets: fonts (Firago), icon SVGs
├── components/       Feature UI components (one directory per component)
│   ├── auth/         Login form, store selector, store switcher dialog
│   ├── base/         Shared dialogs: backdrop, sales channel, store setup
│   ├── checkout/     POS interface: product filter, cart items, cart actions, payment dialog
│   ├── layout/       App shell: header, sidebar
│   ├── order/        Order detail: activity, customer, fulfillment, items, summary
│   ├── orders/       Orders list: table header/footer
│   ├── settings/     Settings sections: preferences, printer, store
│   ├── hoc/          Error boundary HOC and fallback component
│   └── ui/           shadcn/ui primitive wrappers + custom UI (numpad, loading spinner)
├── config/
│   ├── medusa.ts     SDK singleton with custom Tauri HTTP patch
│   └── query.ts      TanStack Query client and default options
├── context/
│   ├── cart/         Cart Zustand store (index.ts + slices/)
│   └── user/         Auth Zustand store
├── hooks/
│   ├── auth/         useAppInit — boot sequence and session hydration
│   ├── barcode/      useBarcodePaste — hardware barcode scanner integration
│   ├── draft-order/  useDraftOrder — draft order create/update operations
│   ├── order/        useOrder — order detail actions
│   ├── printer/      usePrinterService — print receipt, open cash drawer
│   ├── queries/      useQuery* hooks — all React Query data fetching
│   └── ui/           useApplyStoreTheme, useDebounce, useMobile
├── pages/            Thin route entry points (wrap components with error boundary)
├── router/           createHashRouter configuration
├── types/
│   ├── form.ts       Types inferred from Zod schemas
│   └── utils.ts      Domain types (cart, orders, receipts, discounts, etc.)
└── utils/
    ├── cart/         Cart helpers (buildItemMetadata, resolveSelectedItemId)
    ├── constants/    App-wide constants (limits, timeouts, currency, colors)
    ├── helpers/      Formatters, token management, error handling, resetOnBackendChange
    ├── logger/       Tauri log plugin wrapper
    ├── receipt/      jsPDF receipt generation
    ├── schemas/      Zod validation schemas
    ├── sounds/       Audio feedback utilities
    └── storage/      Typed Tauri Store wrapper with discriminated union keys

src-tauri/
├── src/
│   ├── lib.rs        Tauri commands: printer, config, logo management
│   └── config.rs     AppConfig struct (backend_url)
├── tauri.conf.json   App metadata, window config, bundle targets
└── Cargo.toml        Rust dependencies
```

---

## Installation

### Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | |
| Rust (stable) | |
| yarn | 1.x or Berry |
| Tauri CLI | included as a devDependency via `@tauri-apps/cli` |

For desktop builds, follow the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS — this covers required system libraries, WebView2 on Windows, and Xcode Command Line Tools on macOS.

For Android builds, install Android Studio and configure the `ANDROID_HOME` environment variable.

### Install dependencies

```bash
yarn install
```

---

## Environment Configuration

### Environment files

The project supports three Vite modes:

| File | Mode | Used by |
|---|---|---|
| `.env` | default | `yarn dev`, `yarn build` |
| `.env.staging` | staging | `yarn dev:staging`, `yarn build:staging` |
| `.env.production` | production | `yarn dev:production`, `yarn build:production` |

### Available variables

```env
# Default backend URL presented in the store setup screen on first launch.
# Users can override this at runtime — it is not hardcoded after setup.
VITE_BACKEND_URL=https://your-medusa-instance.example.com/
```

`VITE_APP_VERSION` is automatically injected by `vite.config.ts` from git tags matching `v*.*.*`. Do not set it manually.

### Runtime backend configuration

The backend URL is not locked at build time. On first launch, the app checks for a local config file via the Tauri `check_config_exists` command. If no config exists, a setup dialog prompts the user to enter a backend URL, which is validated against the Medusa `/health` endpoint and saved by the Rust layer to an `AppConfig` file in the OS app-local-data directory.

In multi-store environments, separate backend URLs can be stored per store ID and loaded dynamically at login.

---

## Running the Project

### Browser (Vite dev server only)

```bash
yarn dev
yarn dev:staging
yarn dev:production
```

Tauri-specific APIs (storage, printing, file system) are unavailable in the browser. Use this mode only for pure UI development.

### Desktop (Tauri)

```bash
yarn tauri dev              # Hot reload desktop app
yarn tauri:build            # Production build (AppImage / DMG / MSI)
yarn tauri:build:debug      # Debug build with RUST_LOG=debug
```

### Android

```bash
yarn android:build:apk              # Universal APK
yarn android:build:apk:arm64        # arm64-v8a only
yarn android:build:apk:split        # One APK per ABI
yarn android:build:apk:debug        # Debug APK
```

### Utilities

```bash
yarn build              # TypeScript check + Vite production build (no Tauri packaging)
yarn lint               # ESLint over all .ts / .tsx files
yarn typecheck          # tsc --noEmit
```

---

## Setup Flow

### First launch

1. The app boots and runs the `check_config_exists` Tauri command.
2. If no config is found, a **Store Setup** dialog is shown.
3. The user enters a Medusa backend URL. The app hits `<url>/health` to validate.
4. On success, the URL is written to disk via `save_config` and the SDK is initialized.

### Login

1. The login page shows an email/password form and a store selector.
2. The store selector lists previously configured stores. Each store can reference an independent backend URL.
3. Selecting a store sets the active backend URL for that session.
4. On successful login, the JWT is stored in `.auth.dat` (Tauri Store).

### Sales channel selection

After login, the app checks whether a sales channel and stock location have been selected. If not, a **Sales Channel** dialog prompts selection from the list returned by the Medusa API. The selection is persisted to `pos-storage.json`.

### Subsequent launches

The boot sequence:

1. Load config → init SDK
2. Hydrate session (Medusa admin user endpoint)
3. If hydration succeeds → navigate to `/checkout`
4. If 401 → clear auth state → navigate to `/sign-in`

---

## Update Pipeline

The app supports over-the-air updates via the [Tauri updater plugin](https://tauri.app/plugin/updater/). The CI/CD pipeline (GitHub Actions) builds and publishes update artifacts automatically:

- **Production**: pushing a git tag matching `v*.*.*` (e.g. `v1.0.5`) triggers a build and publishes a GitHub Release with signed updater artifacts and a `latest.json` manifest.
- **Manual**: the workflow can also be triggered manually via Actions > Release > Run workflow.

The app checks for updates on launch by fetching:

```
https://github.com/narisolutions/medusa-pos/releases/latest/download/latest.json
```

**Required CI secrets:**

| Variable | Description |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Private key for signing updater artifacts |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code conventions, and branch strategy.

---

## Community

- [Discussions](https://github.com/narisolutions/medusa-pos/discussions) -- Questions, ideas, and general chat
- [Issues](https://github.com/narisolutions/medusa-pos/issues) -- Bug reports and feature requests
- [Contributing](CONTRIBUTING.md) -- How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) -- Community standards
- [Security](SECURITY.md) -- Reporting vulnerabilities

## License

Licensed under the [Apache License 2.0](LICENSE).
