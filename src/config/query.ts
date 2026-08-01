import { QueryClient } from "@tanstack/react-query";
import type { UseQueryOrdersOptions } from "@/types/utils";

// staleTime tiers: `standard` is the client-wide default; `static` is for reference
// data that only changes on backend reconfiguration (cleared on backend-URL change).
export const STALE_TIME = {
  standard: 1000 * 60 * 4,
  static: 1000 * 60 * 30,
} as const;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 30,
            staleTime: STALE_TIME.standard,
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});

// Single home for every query key — never inline string arrays at call sites. Order lists
// nest under ["orders"]; the detail key stays singular so after-sale invalidation skips it.
export const queryKeys = {
  store: ["store"] as const,
  regions: ["regions"] as const,
  salesChannels: ["sales-channels"] as const,
  shippingOptions: ["shipping-options"] as const,
  stockLocations: ["stock-locations"] as const,
  paymentProviders: ["payment-providers"] as const,
  posPlugin: ["pos-plugin-installed"] as const,
  products: {
    all: ["products"] as const,
    list: (salesChannelId?: string) => ["products", salesChannelId] as const,
    byBarcode: (barcode: string) => ["product-by-barcode", barcode] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (options?: UseQueryOrdersOptions) =>
      ["orders", "list", options ?? {}] as const,
    detail: (orderId: string) => ["order", orderId] as const,
    // Keyed by payload shape so the light badge scan and the cash-detail scan
    // never overwrite each other in the cache.
    recent: (withCashDetail: boolean) =>
      ["orders", "recent", withCashDetail ? "cash" : "badge"] as const,
  },
  inventoryKitItems: (
    inventoryItemIds?: string[],
    kitVariantInventoryItems?: unknown
  ) => ["inventory-kit-items", inventoryItemIds, kitVariantInventoryItems] as const,
};
