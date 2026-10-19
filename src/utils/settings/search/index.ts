import type { SettingsSection } from "@/router/routes";

type Translate = (key: string) => string;

/** A field reachable from the settings search. `id` matches a `data-setting` attribute on its page. */
type SettingEntry = {
  id: string;
  section: SettingsSection;
  /** The first is the field's label; the rest make it findable by an option's or a sub-field's name. */
  labelKeys: [string, ...string[]];
};

type SettingsSearchHit = {
  section: SettingsSection;
  setting?: string;
  title: string;
  sectionTitle: string;
};

const SETTINGS_SECTION_TITLES: Record<SettingsSection, string> = {
  printer: "settings.printer.title",
  scanner: "settings.scanner.title",
  connection: "settings.connection.title",
  store: "settings.store.title",
  "quick-keys": "settings.quick_keys.title",
  preferences: "settings.preferences.title",
  plugins: "settings.plugins.title",
};

const SETTINGS_INDEX: SettingEntry[] = [
  { id: "backend-url", section: "connection", labelKeys: ["settings.connection.api_url_label"] },
  { id: "sales-channel", section: "connection", labelKeys: ["settings.connection.sales_channel_label"] },
  { id: "stock-location", section: "connection", labelKeys: ["settings.connection.stock_location_label"] },
  { id: "store-name", section: "store", labelKeys: ["settings.store.store_name_label"] },
  { id: "brand-name", section: "store", labelKeys: ["settings.store.brand_name_label"] },
  { id: "logo", section: "store", labelKeys: ["settings.store.logo_label"] },
  {
    id: "store-address",
    section: "store",
    labelKeys: ["settings.store.store_address_label", "settings.store.store_address2_label"],
  },
  { id: "store-phone", section: "store", labelKeys: ["settings.store.store_phone_label"] },
  { id: "guest-email", section: "store", labelKeys: ["settings.store.guest_email_label"] },
  {
    id: "payment-methods",
    section: "store",
    labelKeys: [
      "settings.store.payment_methods_label",
      "settings.store.type_cash",
      "settings.store.type_card",
      "settings.store.type_bank_transfer",
      "settings.store.type_transfer",
    ],
  },
  { id: "transfer-counterparty", section: "store", labelKeys: ["settings.store.transfer_counterparty_label"] },
  {
    id: "bank-details",
    section: "store",
    labelKeys: [
      "settings.store.bank_details_label",
      "settings.store.bank_beneficiary_label",
      "settings.store.bank_name_label",
      "settings.store.bank_iban_label",
    ],
  },
  { id: "font-size", section: "store", labelKeys: ["settings.store.font_size_label"] },
  {
    id: "brand-colors",
    section: "store",
    labelKeys: ["settings.store.primary_color_label", "settings.store.secondary_color_label"],
  },
  {
    id: "scanner-transport",
    section: "scanner",
    labelKeys: [
      "settings.scanner.transport_label",
      "settings.scanner.transport_wedge",
      "settings.scanner.transport_serial",
    ],
  },
  { id: "scanner-idle", section: "scanner", labelKeys: ["settings.scanner.idle_label"] },
  { id: "scanner-test", section: "scanner", labelKeys: ["settings.scanner.test_label"] },
  { id: "language", section: "preferences", labelKeys: ["settings.preferences.language"] },
  {
    id: "theme",
    section: "preferences",
    labelKeys: ["settings.preferences.theme", "settings.preferences.theme_light", "settings.preferences.theme_dark"],
  },
  { id: "display-size", section: "preferences", labelKeys: ["settings.preferences.display_size"] },
  { id: "fullscreen", section: "preferences", labelKeys: ["settings.preferences.fullscreen"] },
  { id: "date-format", section: "preferences", labelKeys: ["settings.preferences.date_format"] },
  { id: "time-format", section: "preferences", labelKeys: ["settings.preferences.time_format"] },
  {
    id: "currency-format",
    section: "preferences",
    labelKeys: ["settings.preferences.currency_format", "settings.preferences.currency_symbol_position"],
  },
  { id: "decimal-separator", section: "preferences", labelKeys: ["settings.preferences.decimal_separator"] },
  {
    id: "cash-rounding",
    section: "preferences",
    labelKeys: ["settings.preferences.cash_rounding", "settings.preferences.cash_rounding_increment"],
  },
  { id: "sounds", section: "preferences", labelKeys: ["settings.preferences.sounds"] },
];

const normalize = (text: string) => text.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");

/** Sections, then fields, whose translated names contain every word of the query. */
function searchSettings(query: string, t: Translate): SettingsSearchHit[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const matches = (texts: string[]) => {
    const haystack = normalize(texts.join(" "));
    return words.every((word) => haystack.includes(word));
  };

  const sections = (Object.keys(SETTINGS_SECTION_TITLES) as SettingsSection[])
    .filter((section) => matches([t(SETTINGS_SECTION_TITLES[section])]))
    .map((section) => {
      const title = t(SETTINGS_SECTION_TITLES[section]);
      return { section, title, sectionTitle: title };
    });

  const fields = SETTINGS_INDEX.filter(({ section, labelKeys }) =>
    matches([...labelKeys.map((key) => t(key)), t(SETTINGS_SECTION_TITLES[section])])
  ).map(({ id, section, labelKeys }) => ({
    section,
    setting: id,
    title: t(labelKeys[0]),
    sectionTitle: t(SETTINGS_SECTION_TITLES[section]),
  }));

  return [...sections, ...fields];
}

export { SETTINGS_INDEX, SETTINGS_SECTION_TITLES, searchSettings };
export type { SettingEntry, SettingsSearchHit };
