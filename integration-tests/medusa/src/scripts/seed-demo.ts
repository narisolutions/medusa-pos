import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Turns the integration test store into a demo shop for screenshots: branding, payment
 * methods, categories, a few more products, quick keys and a week of sales. Runs after
 * `seed.ts`, against the running server, through the same admin API calls the till
 * makes, so the orders look exactly like ones rung up at a counter.
 *
 * Opt-in (`yarn test:env:demo`), and once only: the store is marked when it's done.
 */

const BASE_URL = "http://localhost:9000"
const DEMO_MARK = "demo_seeded_at"

// The response shapes this script reads; everything else is passed through untouched.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>

const PRODUCTS = [
  {
    title: "Wireless Earbuds",
    category: "Audio",
    options: [{ title: "Color", values: ["Black", "White"] }],
    variants: [
      { title: "Wireless Earbuds Black", sku: "EARBUDS-BLK", barcode: "4006381334013", options: { Color: "Black" }, price: 49.99 },
      { title: "Wireless Earbuds White", sku: "EARBUDS-WHT", barcode: "4006381334020", options: { Color: "White" }, price: 49.99 },
    ],
  },
  {
    title: "Laptop Sleeve 14\"",
    category: "Accessories",
    options: [{ title: "Color", values: ["Grey", "Navy"] }],
    variants: [
      { title: "Laptop Sleeve Grey", sku: "SLEEVE-14-GRY", barcode: "4006381334037", options: { Color: "Grey" }, price: 27.99 },
      { title: "Laptop Sleeve Navy", sku: "SLEEVE-14-NVY", barcode: "4006381334044", options: { Color: "Navy" }, price: 27.99 },
    ],
  },
  // Made without options, as shops often do: Medusa gives these its placeholder option.
  ...[
    { title: "Phone Stand", sku: "STAND-PHONE", barcode: "4006381334051", price: 14.99, category: "Accessories" },
    { title: "Screen Cleaning Kit", sku: "CLEAN-KIT", barcode: "4006381334068", price: 7.99, category: "Accessories" },
    { title: "Gift Bag", sku: "GIFT-BAG", barcode: "4006381334075", price: 1.99, category: "Gifts" },
  ].map((p) => ({
    title: p.title,
    category: p.category,
    options: [{ title: "Default option", values: ["Default option value"] }],
    variants: [
      { title: "Default variant", sku: p.sku, barcode: p.barcode, options: { "Default option": "Default option value" }, price: p.price },
    ],
  })),
]

// Existing products from seed.ts, by title.
const EXISTING_CATEGORIES: Record<string, string> = {
  "USB-C Charging Cable": "Cables",
  "HDMI 4K Cable": "Cables",
  "USB-C Wall Charger 20W": "Charging & power",
  "Portable Power Bank": "Charging & power",
  "Wireless Optical Mouse": "Accessories",
}

const CATEGORIES = ["Cables", "Charging & power", "Audio", "Accessories", "Gifts"]

type Outcome = "delivered" | "awaiting_pickup" | "pay_later" | "refunded"

type DemoOrder = {
  customer?: string
  items: [sku: string, quantity: number][]
  provider: "pp_cash_pos" | "pp_card_pos" | "pp_banktransfer_pos"
  /** Cash handed over, for the change on the receipt. */
  cashPaid?: number
  outcome: Outcome
  daysAgo: number
  time: string
}

const ORDERS: DemoOrder[] = [
  { customer: "jane.doe@example.com", items: [["MOUSE-WL-BLK", 1], ["USBC-CBL-1M", 2]], provider: "pp_card_pos", outcome: "delivered", daysAgo: 5, time: "10:12" },
  { items: [["PWRBNK-10K", 1]], provider: "pp_cash_pos", cashPaid: 40, outcome: "delivered", daysAgo: 5, time: "13:40" },
  { customer: "john.smith@example.com", items: [["HDMI-4K-2M", 1], ["CHRG-USBC-20W", 1]], provider: "pp_card_pos", outcome: "delivered", daysAgo: 4, time: "11:05" },
  { items: [["GIFT-BAG", 1], ["EARBUDS-WHT", 1]], provider: "pp_cash_pos", cashPaid: 60, outcome: "delivered", daysAgo: 4, time: "16:22" },
  { customer: "jane.doe@example.com", items: [["SLEEVE-14-NVY", 1]], provider: "pp_banktransfer_pos", outcome: "delivered", daysAgo: 3, time: "12:30" },
  { items: [["USBC-CBL-2M", 1]], provider: "pp_cash_pos", cashPaid: 20, outcome: "refunded", daysAgo: 3, time: "15:10" },
  { customer: "john.smith@example.com", items: [["PWRBNK-5K", 2]], provider: "pp_banktransfer_pos", outcome: "pay_later", daysAgo: 2, time: "10:45" },
  { items: [["STAND-PHONE", 1], ["CLEAN-KIT", 1]], provider: "pp_card_pos", outcome: "delivered", daysAgo: 2, time: "17:05" },
  { customer: "jane.doe@example.com", items: [["EARBUDS-BLK", 1]], provider: "pp_card_pos", outcome: "awaiting_pickup", daysAgo: 1, time: "14:20" },
  { items: [["USBC-CBL-3M", 1], ["CHRG-USBC-20W", 1]], provider: "pp_cash_pos", cashPaid: 40, outcome: "delivered", daysAgo: 1, time: "18:02" },
  { items: [["HDMI-4K-1M", 3]], provider: "pp_card_pos", outcome: "delivered", daysAgo: 0, time: "09:35" },
  { customer: "john.smith@example.com", items: [["MOUSE-WL-BLK", 1], ["SLEEVE-14-GRY", 1]], provider: "pp_cash_pos", cashPaid: 100, outcome: "delivered", daysAgo: 0, time: "11:50" },
]

// A white wordmark on a brand-blue badge: it reads on the light and the dark header alike.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="236" height="64" viewBox="0 0 236 64"><rect width="236" height="64" rx="14" fill="#2563eb"/><path d="M36 10 20 37h12l-3 18 18-29H35z" fill="#ffffff"/><text x="60" y="42" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff">Demo Store</text></svg>`

const STORE_METADATA = {
  brand_name: "Demo Store",
  logo_url: `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`,
  primary_color: "#2563eb",
  store_address: "123 Main Street",
  store_address_2: "Springfield",
  store_phone: "+1 555 0100",
  guest_customer_email: "walkin@example.com",
  payment_methods: [
    { id: "pp_cash_pos", label: "Cash", enabled: true, icon: "cash", type: "cash" },
    { id: "pp_card_pos", label: "Card", enabled: true, icon: "card", type: "card" },
    { id: "pp_banktransfer_pos", label: "Bank transfer", enabled: true, icon: "bank_transfer", type: "bank_transfer" },
  ],
  bank_details: { beneficiary: "Demo Store", bank_name: "Demo Bank", iban: "GB33BUKB20201555555555" },
}

const QUICK_KEY_SKUS: [sku: string, label?: string][] = [
  ["GIFT-BAG", "Gift bag"],
  ["USBC-CBL-1M", "USB-C 1 m"],
  ["CHRG-USBC-20W", "Charger 20W"],
  ["PWRBNK-10K", "Power bank 10k"],
  ["CLEAN-KIT", "Cleaning kit"],
]

export default async function seedDemo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const db = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const api = await signIn()
  const { stores } = await api("GET", "/admin/stores")
  const store = stores[0]
  if (store.metadata?.[DEMO_MARK]) {
    logger.info("Demo data already seeded, skipping.")
    return
  }
  logger.info("Seeding demo shop...")

  const { regions } = await api("GET", "/admin/regions")
  const region = regions[0]
  const { sales_channels } = await api("GET", "/admin/sales-channels?name=POS%20Channel")
  const salesChannelId: string = sales_channels[0].id
  const { stock_locations } = await api("GET", "/admin/stock-locations?name=Main%20Store")
  const locationId: string = stock_locations[0].id
  const { shipping_options } = await api("GET", "/admin/shipping-options")
  const pickup = shipping_options.find((o: Json) => o.name === "Store Pickup")
  if (!pickup) throw new Error("No Store Pickup shipping option — run seed.ts first")
  // New products must share the pickup option's profile, or their lines can't be handed over.
  const shippingProfileId: string = pickup.shipping_profile_id

  // The till's tenders on the region, next to the system default.
  await api("POST", `/admin/regions/${region.id}`, {
    payment_providers: ["pp_system_default", "pp_cash_pos", "pp_card_pos", "pp_banktransfer_pos"],
  })

  // ── Products and stock ─────────────────────────────────────────────
  const productIdsByCategory = new Map<string, string[]>(CATEGORIES.map((c) => [c, []]))
  for (const product of PRODUCTS) {
    const { product: created } = await api("POST", "/admin/products", {
      title: product.title,
      status: "published",
      shipping_profile_id: shippingProfileId,
      sales_channels: [{ id: salesChannelId }],
      options: product.options,
      variants: product.variants.map((v) => ({
        title: v.title,
        sku: v.sku,
        barcode: v.barcode,
        options: v.options,
        manage_inventory: true,
        prices: [{ amount: v.price, currency_code: "usd" }],
      })),
    })
    productIdsByCategory.get(product.category)!.push(created.id)
    for (const variant of product.variants) {
      const item = await inventoryItemBySku(api, variant.sku)
      await api("POST", `/admin/inventory-items/${item.id}/location-levels`, {
        location_id: locationId,
        stocked_quantity: 40,
      })
    }
  }
  const { products: existing } = await api("GET", "/admin/products?limit=100&fields=id,title")
  for (const product of existing as Json[]) {
    const category = EXISTING_CATEGORIES[product.title]
    if (category) productIdsByCategory.get(category)!.push(product.id)
  }
  for (const name of CATEGORIES) {
    const { product_category } = await api("POST", "/admin/product-categories", {
      name,
      is_active: true,
      is_internal: false,
    })
    await api("POST", `/admin/product-categories/${product_category.id}/products`, {
      add: productIdsByCategory.get(name),
    })
  }
  logger.info(`Added ${PRODUCTS.length} products and ${CATEGORIES.length} categories`)

  // ── Store: branding, payment methods, quick keys ───────────────────
  const variantIdBySku = await variantIds(api)
  await api("POST", `/admin/stores/${store.id}`, {
    name: "Demo Store",
    metadata: {
      ...store.metadata,
      pos: {
        ...store.metadata?.pos,
        ...STORE_METADATA,
        quick_keys: QUICK_KEY_SKUS.map(([sku, label]) => ({ variant_id: variantIdBySku.get(sku), label })),
      },
    },
  })

  // ── A week of sales, rung up the way the till does it ──────────────
  const { customers } = await api("GET", "/admin/customers?limit=50")
  const customerByEmail = new Map<string, Json>((customers as Json[]).map((c) => [c.email, c]))
  for (const spec of ORDERS) {
    try {
      const order = await ringUp(api, spec, {
        regionId: region.id,
        salesChannelId,
        locationId,
        pickup,
        customer: spec.customer ? customerByEmail.get(spec.customer) : undefined,
        variantIdBySku,
      })
      // Spread the sales over the past week, during opening hours.
      const at = new Date()
      at.setDate(at.getDate() - spec.daysAgo)
      const [h, m] = spec.time.split(":").map(Number)
      at.setHours(h, m, 0, 0)
      await db("order").where({ id: order.id }).update({ created_at: at, updated_at: at })
    } catch (error) {
      logger.warn(`Demo order failed (${spec.items.map(([sku]) => sku).join(", ")}): ${(error as Error).message}`)
    }
  }
  logger.info(`Rang up ${ORDERS.length} demo sales`)

  // A low and an empty shelf, so stock badges show in the catalog and search.
  await setStock(api, "CLEAN-KIT", locationId, 3)
  await setStock(api, "EARBUDS-WHT", locationId, 0)

  await api("POST", `/admin/stores/${store.id}`, {
    metadata: { ...(await api("GET", `/admin/stores/${store.id}`)).store.metadata, [DEMO_MARK]: new Date().toISOString() },
  })
  logger.info("Demo shop ready: Demo Store")
}

type Api = (method: string, path: string, body?: unknown) => Promise<Json>

async function signIn(): Promise<Api> {
  const auth = await fetch(`${BASE_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.MEDUSA_ADMIN_EMAIL, password: process.env.MEDUSA_ADMIN_PASSWORD }),
  })
  if (!auth.ok) throw new Error(`Admin sign-in failed: ${auth.status}`)
  const { token } = (await auth.json()) as { token: string }

  return async (method, path, body) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`)
    return res.status === 204 ? {} : ((await res.json()) as Json)
  }
}

async function inventoryItemBySku(api: Api, sku: string): Promise<Json> {
  const { inventory_items } = await api("GET", `/admin/inventory-items?sku=${encodeURIComponent(sku)}`)
  if (!inventory_items[0]) throw new Error(`No inventory item for ${sku}`)
  return inventory_items[0]
}

async function setStock(api: Api, sku: string, locationId: string, quantity: number) {
  const item = await inventoryItemBySku(api, sku)
  await api("POST", `/admin/inventory-items/${item.id}/location-levels/${locationId}`, { stocked_quantity: quantity })
}

async function variantIds(api: Api): Promise<Map<string, string>> {
  const { products } = await api("GET", "/admin/products?limit=100&fields=id,variants.id,variants.sku")
  const ids = new Map<string, string>()
  for (const product of products as Json[]) {
    for (const variant of product.variants ?? []) ids.set(variant.sku, variant.id)
  }
  return ids
}

type RingUpContext = {
  regionId: string
  salesChannelId: string
  locationId: string
  pickup: Json
  customer: Json | undefined
  variantIdBySku: Map<string, string>
}

/** One sale, the till's way: draft → order → payment → hand-over. */
async function ringUp(api: Api, spec: DemoOrder, ctx: RingUpContext): Promise<Json> {
  const payLater = spec.outcome === "pay_later"
  const { draft_order } = await api("POST", "/admin/draft-orders", {
    email: ctx.customer?.email ?? "walkin@example.com",
    ...(ctx.customer ? { customer_id: ctx.customer.id } : {}),
    region_id: ctx.regionId,
    sales_channel_id: ctx.salesChannelId,
    shipping_address: { country_code: "us" },
    items: spec.items.map(([sku, quantity]) => ({ variant_id: ctx.variantIdBySku.get(sku), quantity })),
    shipping_methods: [{ shipping_option_id: ctx.pickup.id, name: ctx.pickup.name, amount: 0 }],
    metadata: payLater
      ? { pay_later: true, pay_later_method: spec.provider }
      : spec.cashPaid
        ? { cash_paid: spec.cashPaid }
        : {},
  })
  const { order } = await api("POST", `/admin/draft-orders/${draft_order.id}/convert-to-order`)

  let paymentId: string | undefined
  if (!payLater) {
    const { order: withPayments } = await api(
      "GET",
      `/admin/orders/${order.id}?fields=total,*payment_collections`
    )
    let collectionId: string | undefined = (withPayments.payment_collections ?? []).find(
      (c: Json) => c.status !== "canceled" && c.status !== "completed"
    )?.id
    if (!collectionId) {
      const { payment_collection } = await api("POST", "/admin/payment-collections", {
        order_id: order.id,
        amount: withPayments.total,
      })
      collectionId = payment_collection.id
    }
    const { payment_collection } = await api(
      "POST",
      `/admin/payment-collections/${collectionId}/payment-sessions?fields=*payments`,
      { provider_id: spec.provider }
    )
    const pending = (payment_collection.payments ?? []).find((p: Json) => !p.captured_at)
    if (pending) {
      await api("POST", `/admin/payments/${pending.id}/capture`, {})
    } else {
      // As the till does when a provider doesn't authorize on its own.
      await api("POST", `/admin/payment-collections/${collectionId}/mark-as-paid`, {
        order_id: order.id,
        provider_id: spec.provider,
      })
    }
    const { order: paid } = await api(
      "GET",
      `/admin/orders/${order.id}?fields=payment_status,*payment_collections.payments`
    )
    if (paid.payment_status !== "captured") throw new Error(`payment not captured (${paid.payment_status})`)
    paymentId = (paid.payment_collections as Json[]).flatMap((c) => c.payments ?? [])[0]?.id
  }

  if (spec.outcome !== "awaiting_pickup") {
    const { order: full } = await api("GET", `/admin/orders/${order.id}?fields=*items`)
    const { order: fulfilled } = await api("POST", `/admin/orders/${order.id}/fulfillments?fields=*fulfillments`, {
      items: (full.items as Json[]).map((i) => ({ id: i.id, quantity: i.quantity })),
      location_id: ctx.locationId,
    })
    const fulfillmentId = fulfilled.fulfillments?.[0]?.id
    if (fulfillmentId) {
      await api("POST", `/admin/orders/${order.id}/fulfillments/${fulfillmentId}/mark-as-delivered`, {})
    }
    if (!payLater) await api("POST", `/admin/orders/${order.id}/complete`, {})
  }

  if (spec.outcome === "refunded" && paymentId) {
    const { order: paid } = await api("GET", `/admin/orders/${order.id}?fields=total`)
    await api("POST", `/admin/payments/${paymentId}/refund`, { amount: paid.total })
  }
  return order
}
