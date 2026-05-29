import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
  ShippingOptionPriceType,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createProductsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  createInventoryLevelsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  createShippingProfilesWorkflow,
  batchLinksWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("Seeding POS test data...")

  // Skip if already seeded (idempotency guard for container restarts)
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "countries.iso_2"],
  })
  const alreadySeeded = existingRegions.some(
    (r: { countries?: { iso_2: string }[] }) =>
      r.countries?.some((c) => c.iso_2 === "us")
  )
  if (alreadySeeded) {
    logger.info("Seed data already exists, skipping.")
    return
  }

  // ── Store ──────────────────────────────────────────────────────────
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id"],
  })
  const store = stores[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "POS Test Store",
        supported_currencies: [
          { currency_code: "usd", is_default: true },
          { currency_code: "eur" },
        ],
      },
    },
  })
  logger.info("Store updated")

  // ── Region ─────────────────────────────────────────────────────────
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })
  logger.info("Region created: %s", regions[0].id)

  // ── Sales Channel ──────────────────────────────────────────────────
  const { result: salesChannels } = await createSalesChannelsWorkflow(
    container
  ).run({
    input: {
      salesChannelsData: [
        {
          name: "POS Channel",
          description: "Point of Sale sales channel for integration testing",
        },
      ],
    },
  })
  const salesChannelId = salesChannels[0].id
  logger.info("Sales channel created: %s", salesChannelId)

  // ── Stock Location ─────────────────────────────────────────────────
  const { result: stockLocations } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Main Store",
          address: {
            address_1: "123 Test Street",
            city: "Portland",
            province: "OR",
            country_code: "us",
            postal_code: "97201",
          },
        },
      ],
    },
  })
  const stockLocationId = stockLocations[0].id
  logger.info("Stock location created: %s", stockLocationId)

  // ── Link Sales Channel → Stock Location ────────────────────────────
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocationId,
      add: [salesChannelId],
      remove: [],
    },
  })
  logger.info("Sales channel linked to stock location")

  // ── Fulfillment: set, service zone, profile, pickup shipping option ─
  // Orders need a shipping method; POS draft order prefers a "pickup" option.
  await createLocationFulfillmentSetWorkflow(container).run({
    input: {
      location_id: stockLocationId,
      fulfillment_set_data: {
        name: "POS Fulfillment",
        type: "shipping",
      },
    },
  })
  logger.info("Fulfillment set linked to stock location")

  // DB id is `{identifier}_{options.id}` (e.g. manual_manual), not the container key fp_manual_manual.
  const manualFulfillmentProviderId = "manual_manual"
  await batchLinksWorkflow(container).run({
    input: {
      create: [
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
          [Modules.FULFILLMENT]: {
            fulfillment_provider_id: manualFulfillmentProviderId,
          },
        },
      ],
      delete: [],
    },
  })
  logger.info(
    "Linked manual fulfillment provider (%s) to stock location",
    manualFulfillmentProviderId
  )

  const { data: locationsWithFulfillment } = await query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_sets.id"],
  })
  const stockLoc = locationsWithFulfillment.find(
    (l: { id: string }) => l.id === stockLocationId
  ) as { id: string; fulfillment_sets?: { id: string }[] } | undefined
  const fulfillmentSetId = stockLoc?.fulfillment_sets?.[0]?.id
  if (!fulfillmentSetId) {
    throw new Error(
      "Seed: no fulfillment set on stock location after createLocationFulfillmentSetWorkflow"
    )
  }

  const { result: serviceZones } = await createServiceZonesWorkflow(
    container
  ).run({
    input: {
      data: [
        {
          name: "United States",
          fulfillment_set_id: fulfillmentSetId,
          geo_zones: [{ type: "country" as const, country_code: "us" }],
        },
      ],
    },
  })
  const serviceZoneId = serviceZones[0].id
  logger.info("Service zone created: %s", serviceZoneId)

  const { result: shippingProfiles } = await createShippingProfilesWorkflow(
    container
  ).run({
    input: {
      data: [
        {
          name: "POS Default",
          type: "default",
        },
      ],
    },
  })
  const shippingProfileId = shippingProfiles[0].id
  logger.info("Shipping profile created: %s", shippingProfileId)

  // createShippingOptionsWorkflow validates providers via remoteQuery field
  // `fulfillment_set.locations.*`, but the graph exposes `location` (singular), so
  // validation always fails. Mirror the workflow after that step: upsert option,
  // create price set, link option ↔ price set.
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const pricingService = container.resolve(Modules.PRICING)
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)

  const shippingOption = await fulfillmentService.upsertShippingOptions({
    name: "Store Pickup",
    service_zone_id: serviceZoneId,
    shipping_profile_id: shippingProfileId,
    provider_id: manualFulfillmentProviderId,
    type: {
      label: "Pickup",
      description: "Pick up at store counter",
      code: "pickup",
    },
    price_type: ShippingOptionPriceType.FLAT,
  })

  const [priceSet] = await pricingService.createPriceSets([
    {
      prices: [
        { amount: 0, currency_code: "usd" },
        { amount: 0, currency_code: "eur" },
      ],
    },
  ])

  await remoteLink.create([
    {
      [Modules.FULFILLMENT]: { shipping_option_id: shippingOption.id },
      [Modules.PRICING]: { price_set_id: priceSet.id },
    },
  ])
  logger.info("Shipping option created: Store Pickup (manual fulfillment)")

  // ── Products ───────────────────────────────────────────────────────
  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "USB-C Charging Cable",
          description:
            "USB 2.0 Type-C to Type-C for phones, tablets, and laptops. Black PVC jacket.",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [
            { title: "Length", values: ["1m", "1.5m", "2m", "3m"] },
          ],
          variants: [
            {
              title: "USB-C Cable 1 m",
              sku: "USBC-CBL-1M",
              barcode: "5901234123457",
              options: { Length: "1m" },
              prices: [
                { amount: 9.99, currency_code: "usd" },
                { amount: 8.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "USB-C Cable 1.5 m",
              sku: "USBC-CBL-1M5",
              barcode: "5901234123464",
              options: { Length: "1.5m" },
              prices: [
                { amount: 11.99, currency_code: "usd" },
                { amount: 10.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "USB-C Cable 2 m",
              sku: "USBC-CBL-2M",
              barcode: "5901234123471",
              options: { Length: "2m" },
              prices: [
                { amount: 12.99, currency_code: "usd" },
                { amount: 11.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "USB-C Cable 3 m",
              sku: "USBC-CBL-3M",
              barcode: "5901234123488",
              options: { Length: "3m" },
              prices: [
                { amount: 14.99, currency_code: "usd" },
                { amount: 13.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "USB-C Wall Charger 20W",
          description:
            "Single USB-C port, 20 W output. Foldable prongs for travel.",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [{ title: "Color", values: ["White"] }],
          variants: [
            {
              title: "USB-C Wall Charger 20W White",
              sku: "CHRG-USBC-20W",
              barcode: "4006381333931",
              options: { Color: "White" },
              prices: [
                { amount: 18.99, currency_code: "usd" },
                { amount: 16.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "Wireless Optical Mouse",
          description:
            "2.4 GHz USB receiver; optical sensor. Works on most surfaces.",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [{ title: "Color", values: ["Black"] }],
          variants: [
            {
              title: "Wireless Mouse Black",
              sku: "MOUSE-WL-BLK",
              barcode: "0012345678905",
              options: { Color: "Black" },
              prices: [
                { amount: 24.99, currency_code: "usd" },
                { amount: 22.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "HDMI 4K Cable",
          description:
            "High-speed HDMI with Ethernet. 4K / 60 Hz. Gold-plated connectors.",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [{ title: "Length", values: ["1m", "2m"] }],
          variants: [
            {
              title: "HDMI 4K Cable 1 m",
              sku: "HDMI-4K-1M",
              barcode: "9780201379624",
              options: { Length: "1m" },
              prices: [
                { amount: 12.99, currency_code: "usd" },
                { amount: 11.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "HDMI 4K Cable 2 m",
              sku: "HDMI-4K-2M",
              barcode: "9780201379631",
              options: { Length: "2m" },
              prices: [
                { amount: 15.99, currency_code: "usd" },
                { amount: 14.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "Portable Power Bank",
          description:
            "USB-A and USB-C outputs. LED charge indicator. For phones and accessories.",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [
            { title: "Capacity", values: ["5000mAh", "10000mAh"] },
          ],
          variants: [
            {
              title: "Power Bank 5000 mAh",
              sku: "PWRBNK-5K",
              barcode: "8710398527837",
              options: { Capacity: "5000mAh" },
              prices: [
                { amount: 22.99, currency_code: "usd" },
                { amount: 20.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "Power Bank 10000 mAh",
              sku: "PWRBNK-10K",
              barcode: "8710398527844",
              options: { Capacity: "10000mAh" },
              prices: [
                { amount: 32.99, currency_code: "usd" },
                { amount: 29.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
      ],
    },
  })
  logger.info("Created %d products", products.length)

  // ── Inventory Levels ───────────────────────────────────────────────
  // Collect all inventory items created with the product variants
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  })

  if (inventoryItems.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: inventoryItems.map(
          (item: { id: string; sku: string }) => ({
            inventory_item_id: item.id,
            location_id: stockLocationId,
            stocked_quantity: 100,
          })
        ),
      },
    })
    logger.info(
      "Created inventory levels for %d items at %s",
      inventoryItems.length,
      stockLocationId
    )
  }

  // ── Customers ──────────────────────────────────────────────────────
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  await customerModuleService.createCustomers([
    {
      first_name: "Jane",
      last_name: "Doe",
      email: "jane.doe@example.com",
      phone: "+1-555-0101",
    },
    {
      first_name: "John",
      last_name: "Smith",
      email: "john.smith@example.com",
      phone: "+1-555-0102",
    },
    {
      first_name: "Walk-in",
      last_name: "Customer",
      email: "walkin@example.com",
    },
  ])
  logger.info("Created test customers")

  logger.info("Seeding complete!")
}
