const SETTINGS_SECTIONS = ["printer", "scanner", "connection", "store", "preferences", "plugins"] as const;
type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const ROUTES = {
  signIn: "/sign-in",
  checkout: "/checkout",
  orders: "/orders",
  order: (orderId: string) => `/orders/${orderId}`,
  parked: "/parked",
  settings: "/settings",
  settingsSection: (section: SettingsSection) => `/settings/${section}`,
  /** Development-only UI catalogue (docs/ui-ux). */
  devUi: "/dev/ui",
} as const;

export { ROUTES, SETTINGS_SECTIONS };
export type { SettingsSection };
