const ROUTES = {
  signIn: "/sign-in",
  checkout: "/checkout",
  orders: "/orders",
  order: (orderId: string) => `/orders/${orderId}`,
  parked: "/parked",
  settings: "/settings",
} as const;

export { ROUTES };
