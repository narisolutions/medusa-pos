const ROUTES = {
  signIn: "/sign-in",
  checkout: "/checkout",
  orders: "/orders",
  order: (orderId: string) => `/orders/${orderId}`,
  parked: "/parked",
  settings: "/settings",
  /** Development-only UI catalogue (docs/ui-ux). */
  devUi: "/dev/ui",
} as const;

export { ROUTES };
