import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createProductsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const remoteQuery = container.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  )

  logger.info("Seeding POS test data...")

  // ── Store ──────────────────────────────────────────────────────────
  const stores = await remoteQuery(
    remoteQueryObjectFromString({ entryPoint: "store", fields: ["id"] })
  )
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
    },
  })
  logger.info("Sales channel linked to stock location")

  // ── Products ───────────────────────────────────────────────────────
  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Classic T-Shirt",
          description: "A comfortable cotton t-shirt",
          status: ProductStatus.PUBLISHED,
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
          sales_channels: [{ id: salesChannelId }],
          variants: [
            {
              title: "Default",
              sku: "MUG-WHT-350",
              barcode: "4006381333931",
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
          sales_channels: [{ id: salesChannelId }],
          variants: [
            {
              title: "Default",
              sku: "MOUSE-WL-BLK",
              barcode: "0012345678905",
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
  const inventoryItems = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "inventory_item",
      fields: ["id", "sku"],
    })
  )

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
