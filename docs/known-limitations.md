# Known limitations

This page lists the limitations we know about in Medusa POS: what an operator will
notice, why it happens, how to work around it today, and what a fix would involve. It is
kept current — an entry is removed when its limitation is resolved.

Most of these come from the boundary with the backend: a capability the Medusa Admin API
does not offer, or a query the app runs on the device because no server-side equivalent
exists yet. Contributions toward any of the resolutions below are welcome.

**Applies to:** Medusa POS against Medusa `2.19.x` (see [Medusa Version Tested](../README.md#medusa-version-tested)).
**Last reviewed:** 2026-10-05

## Reading this page

Each limitation has a stable ID (`KL-n`) that issues and pull requests can refer to.

| Field | Meaning |
|---|---|
| **Area** | The part of the app affected |
| **Origin** | `Medusa API` — the backend does not support it; `POS plugin` — needs [`@narisolutions/medusa-plugin-pos`](https://github.com/narisolutions/medusa-plugins); `App` — a design choice in this app that can be changed here |
| **Impact** | `High` — can give an operator a wrong figure or a wrong result; `Medium` — a feature is incomplete at scale; `Low` — rarely noticed |

## Summary

| ID | Limitation | Area | Origin | Impact |
|---|---|---|---|---|
| [KL-1](#kl-1-order-search-covers-the-newest-500-orders) | Order search covers the newest 500 orders | Orders | App | Medium |
| [KL-2](#kl-2-expected-cash-reads-at-most-1000-orders-per-session) | Expected cash reads at most 1,000 orders per session | Cash reconciliation | Medusa API | High |
| [KL-3](#kl-3-the-unfulfilled-orders-badge-counts-the-newest-1000-orders) | The unfulfilled-orders badge counts the newest 1,000 orders | Navigation | Medusa API | Low |
| [KL-4](#kl-4-the-parked-sales-list-shows-at-most-500-sales) | The parked-sales list shows at most 500 sales | Parked sales | App | Low |
| [KL-5](#kl-5-a-parked-sales-customer-cannot-be-cleared) | A parked sale's customer cannot be cleared | Checkout | Medusa API | Low |
| [KL-6](#kl-6-stock-is-not-held-while-a-sale-is-parked) | Stock is not held while a sale is parked | Parked sales | Medusa API | Medium |
| [KL-7](#kl-7-kit-component-stock-is-summed-across-all-locations) | Kit component stock is summed across all locations | Checkout | App | Medium |
| [KL-8](#kl-8-one-region-and-one-store-per-backend) | One region and one store per backend | Checkout | App | Medium |
| [KL-9](#kl-9-scanning-pricing-and-kit-availability-need-the-pos-plugin) | Scanning, pricing and kit availability need the POS plugin | Catalog | POS plugin | High |
| [KL-10](#kl-10-the-catalog-is-capped-at-10000-products-without-the-plugin) | The catalog is capped at 10,000 products without the plugin | Catalog | App | Low |

---

## KL-1: Order search covers the newest 500 orders

**Area:** Orders · **Origin:** App · **Impact:** Medium

**Impact.** Searching or filtering on the Orders page finds nothing for an order older
than the newest 500, although the order exists in Medusa.

**Cause.** The page loads a single page of the 500 most recent orders and filters and
searches it on the device (`useOrdersWithData`, `src/components/orders/hooks.tsx`). Older
orders are never requested.

**Workaround.** Look the order up in Medusa Admin.

**Resolution.** Move search, filters and paging to the server: send the search text as
the list route's `q` parameter and the filters as list parameters, and page with
`limit`/`offset` rather than loading a fixed window. The table then shows one server page
at a time.

## KL-2: Expected cash reads at most 1,000 orders per session

**Area:** Cash reconciliation · **Origin:** Medusa API · **Impact:** High

**Impact.** For a register session with more than 1,000 orders, the expected cash in the
drawer leaves out the oldest orders of the session, so the close reports a difference
that is not real.

**Cause.** There is no endpoint that totals cash by session, so the app downloads the
session's orders (one request, `limit: 1000`) and adds them up on the device
(`useQuerySessionOrders`, `src/hooks/queries/useQuerySessionOrders.ts`).

**Workaround.** None in the app. Sessions this large are unusual for a single till.

**Resolution.** Either page through all of the session's orders, or — better — add a
session cash total to the POS plugin so the device receives one figure instead of every
order.

## KL-3: The unfulfilled-orders badge counts the newest 1,000 orders

**Area:** Navigation · **Origin:** Medusa API · **Impact:** Low

**Impact.** The sidebar's unfulfilled-orders badge can undercount when unfulfilled
orders are older than the newest 1,000. The response is also large, because computing
fulfillment status makes Medusa include every order's line items.

**Cause.** The order list route cannot filter by `fulfillment_status`, so the count is
taken on the device over the newest 1,000 orders (`useQueryRecentOrders`).

**Workaround.** The Orders page's fulfillment filter shows the full picture within its
own limit (see [KL-1](#kl-1-order-search-covers-the-newest-500-orders)).

**Resolution.** A count route in the POS plugin that returns the number of unfulfilled
orders, as the parked-sales badge already does with the draft-order `count`.

## KL-4: The parked-sales list shows at most 500 sales

**Area:** Parked sales · **Origin:** App · **Impact:** Low

**Impact.** With more than 500 parked sales, the oldest do not appear in the list. The
sidebar badge still counts all of them.

**Cause.** The list requests one page of 500 drafts, newest first (`useQueryDraftOrders`).

**Workaround.** Discard or complete stale parked sales; they can also be managed in
Medusa Admin.

**Resolution.** Server-side paging for the parked-sales table.

## KL-5: A parked sale's customer cannot be cleared

**Area:** Checkout · **Origin:** Medusa API · **Impact:** Low

**Impact.** None visible: the app works around it. It is recorded because the
workaround changes what the backend stores.

**Cause.** The draft-order update route accepts `customer_id` only as a string; it cannot
be set to `null`, and updating the email alone leaves the customer in place.

**Workaround (applied by the app).** Removing a customer from a parked sale attaches the
customer behind the store's guest email instead, finding or creating it — the same
customer Medusa assigns when a draft is created from that email
(`resolveCustomerIdByEmail`, `src/utils/pos/draft-order/sync.ts`).

**Resolution.** Support for clearing `customer_id` in Medusa's draft-order update route.

## KL-6: Stock is not held while a sale is parked

**Area:** Parked sales · **Origin:** Medusa API · **Impact:** Medium

**Impact.** Items in a parked sale can be sold at another till in the meantime. When the
sale is resumed, availability is checked again and the operator is told what changed.

**Cause.** Draft orders do not reserve inventory in Medusa until they are converted to
orders.

**Workaround.** Resume promptly; act on the stock warning shown on resume. A line that is
out of stock blocks payment until it is removed.

**Resolution.** Inventory reservations for parked sales are specified in
[Draft Orders, phase 2](./draft-orders/07-reservations-phase-2.md).

## KL-7: Kit component stock is summed across all locations

**Area:** Checkout · **Origin:** App · **Impact:** Medium

**Impact.** The variant dialog of a kit shows each component's stock across all stock
locations, which can be more than the till's own location holds.

**Cause.** The figure is the inventory item's total stocked minus reserved quantity,
read in one request for the kit's items.

**Workaround.** Check the location's stock in Medusa Admin before promising a kit.

**Resolution.** Read the inventory item's `location_levels` and use the level of the
till's configured stock location.

## KL-8: One region and one store per backend

**Area:** Checkout · **Origin:** App · **Impact:** Medium

**Impact.** New sales always use the backend's first region — its currency and
country — and the app reads settings from the first store. A backend with several regions
or stores cannot choose between them per till.

**Cause.** The app takes `regions[0]` and `stores[0]` from the list routes.

**Workaround.** Keep the till's region first in the backend, or run one store per backend.

**Resolution.** A region (and, where relevant, store) setting per till, next to the sales
channel and stock location in Settings → Connection.

## KL-9: Scanning, pricing and kit availability need the POS plugin

**Area:** Catalog · **Origin:** POS plugin · **Impact:** High

**Impact.** Against a backend without the plugin, barcode scanning is unavailable,
prices are not computed for the till's context, and kit availability is not checked.

**Cause.** The Medusa Admin API has no barcode lookup and returns raw price arrays and
unreliable variant stock. See the [Compatibility](../README.md#compatibility) table.

**Workaround.** Install [`@narisolutions/medusa-plugin-pos`](https://github.com/narisolutions/medusa-plugins)
on the backend.

**Resolution.** None planned in the app — the plugin is the supported path.

## KL-10: The catalog is capped at 10,000 products without the plugin

**Area:** Catalog · **Origin:** App · **Impact:** Low

**Impact.** Without the plugin, a catalog larger than 10,000 products is cut off; a
warning is written to the log.

**Cause.** The fallback loader pages through the Admin product list, 100 products per
page, up to 100 pages (`useQueryProducts`).

**Workaround.** Install the POS plugin, which serves the catalog in one request.

**Resolution.** Search the catalog on the server instead of loading all of it on the device.
