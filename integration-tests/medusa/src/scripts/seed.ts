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
          title: "Classic T-Shirt",
          description: "A comfortable cotton t-shirt",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [{ title: "Size", values: ["S", "M", "L", "XL"] }],
          variants: [
            {
              title: "Small",
              sku: "TSHIRT-BLK-S",
              barcode: "5901234123457",
              options: { Size: "S" },
              prices: [
                { amount: 19.99, currency_code: "usd" },
                { amount: 17.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "Medium",
              sku: "TSHIRT-BLK-M",
              barcode: "5901234123464",
              options: { Size: "M" },
              prices: [
                { amount: 19.99, currency_code: "usd" },
                { amount: 17.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "Large",
              sku: "TSHIRT-BLK-L",
              barcode: "5901234123471",
              options: { Size: "L" },
              prices: [
                { amount: 19.99, currency_code: "usd" },
                { amount: 17.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "Extra Large",
              sku: "TSHIRT-BLK-XL",
              barcode: "5901234123488",
              options: { Size: "XL" },
              prices: [
                { amount: 22.99, currency_code: "usd" },
                { amount: 20.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "Coffee Mug",
          description: "Ceramic mug, 350ml",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [{ title: "Type", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: "MUG-WHT-350",
              barcode: "4006381333931",
              options: { Type: "Default" },
              prices: [
                { amount: 12.99, currency_code: "usd" },
                { amount: 11.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "Wireless Mouse",
          description: "Ergonomic wireless mouse with USB receiver",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [{ title: "Type", values: ["Default"] }],
          variants: [
            {
              title: "Default",
              sku: "MOUSE-WL-BLK",
              barcode: "0012345678905",
              options: { Type: "Default" },
              prices: [
                { amount: 34.99, currency_code: "usd" },
                { amount: 31.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "Notebook",
          description: "A5 hardcover notebook, 200 pages",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [
            { title: "Style", values: ["Ruled", "Blank"] },
          ],
          variants: [
            {
              title: "Ruled",
              sku: "NOTE-A5-RULED",
              barcode: "9780201379624",
              options: { Style: "Ruled" },
              prices: [
                { amount: 8.99, currency_code: "usd" },
                { amount: 7.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "Blank",
              sku: "NOTE-A5-BLANK",
              barcode: "9780201379631",
              options: { Style: "Blank" },
              prices: [
                { amount: 8.99, currency_code: "usd" },
                { amount: 7.99, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
          ],
        },
        {
          title: "Water Bottle",
          description: "Stainless steel insulated water bottle",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: salesChannelId }],
          options: [
            { title: "Size", values: ["500ml", "1L"] },
          ],
          variants: [
            {
              title: "500ml",
              sku: "BOTTLE-SS-500",
              barcode: "8710398527837",
              options: { Size: "500ml" },
              prices: [
                { amount: 24.99, currency_code: "usd" },
                { amount: 22.49, currency_code: "eur" },
              ],
              manage_inventory: true,
            },
            {
              title: "1L",
              sku: "BOTTLE-SS-1000",
              barcode: "8710398527844",
              options: { Size: "1L" },
              prices: [
                { amount: 29.99, currency_code: "usd" },
                { amount: 27.49, currency_code: "eur" },
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
