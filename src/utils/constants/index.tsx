export default {
  PROD: import.meta.env.MODE === "production",

  // Boot timeout
  BOOT_TIMEOUT_MS: 10_000 as const,


  CHECKOUT_CONFIG: {
    // Validation rules
    MAX_QUANTITY_PER_ITEM: 99,
    MAX_ITEMS_IN_CART: 50,
    MAX_RETRY_ATTEMPTS: 3,

    // UI settings
    SEARCH_DEBOUNCE_MS: 300,
    TOAST_DURATION: 3000,
    AUTO_CLOSE_PAYMENT_MODAL: false,

    // Business rules
    // Default fallback currency code (most prices should use Medusa order/store/region currency instead of this)
    CURRENCY: "USD",
    BARCODE_VALIDATION_PATTERN: /^\d{8,18}$/,

    // Performance
    SEARCH_RESULTS_LIMIT: 10,
    CART_PERSISTENCE_KEY: "store-cart",

    // Payment
    PAYMENT_TIMEOUT_MS: 30000,
    CASH_DRAWER_TIMEOUT_MS: 5000,

    // Monitoring
    ENABLE_ANALYTICS: true,
    LOG_ERRORS: true,
  } as const,

  QUICK_CASH_AMOUNTS: [0.5, 1, 2, 5, 10, 20, 50, 100] as const,
  
  // Logo
  MAX_LOGO_BYTES: 256 * 1024, // 256 KB

  // Order Status Colors
  ORDER_STATUS_COLORS: {
    pending: "bg-yellow-500",
    completed: "bg-green-500",
    draft: "bg-gray-500",
    archived: "bg-gray-600",
    canceled: "bg-red-500",
    requires_action: "bg-orange-500",
  } as const,

  ORDER_FULFILLMENT_STATUS_COLORS: {
    canceled: "bg-red-500",
    not_fulfilled: "bg-red-500",
    partially_fulfilled: "bg-yellow-500",
    fulfilled: "bg-green-500",
    partially_shipped: "bg-blue-500",
    shipped: "bg-blue-600",
    partially_delivered: "bg-yellow-500",
    delivered: "bg-green-600",
  } as const,

  ORDER_PAYMENT_STATUS_COLORS: {
    canceled: "bg-red-500",
    not_paid: "bg-gray-500",
    awaiting: "bg-yellow-500",
    authorized: "bg-yellow-500",
    partially_authorized: "bg-yellow-500",
    captured: "bg-green-500",
    partially_captured: "bg-green-400",
    partially_refunded: "bg-orange-500",
    refunded: "bg-red-500",
    requires_action: "bg-orange-500",
  } as const,

  // Order Guest Email
  ORDER_GUEST_EMAIL: "guest@pos.local" as const,

  // Order Button Styling
  ORDER_BUTTON_BASE_CLASSES: "px-6 py-3 text-base font-medium min-h-[48px] touch-manipulation",
  ORDER_BUTTON_LG_CLASSES: "px-6 py-3 text-base font-medium min-h-[48px] touch-manipulation min-w-[140px]",


POS_ENDPOINT_MISSING_MESSAGE: "Custom POS endpoints are not available on your backend. Add the /pos routes to your Medusa backend to use this feature." as const,
};
