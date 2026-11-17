import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "@/i18n";
import { useCartStore } from "@/context/cart";
import { useTheme } from "@/context/theme";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { loadPreferences } from "@/utils/settings/preferences";
import { getBrandName, getLogoUrl, getPrimaryColor } from "@/utils/settings/store/metadata";
import {
  configureCustomerDisplayPublisher,
  startCustomerDisplayPublisher,
  type CartSource,
  type PublisherConfig,
} from "@/utils/customer-display/publisher";
import { tauriTransport } from "@/utils/customer-display/transport";
import { cartTotals } from "@/utils/customer-display/cart-totals";
import { pricesIncludeVat } from "@/utils/customer-display/vat";
import { useQueryVatRate } from "@/hooks/queries/useQueryVatRate";
import { displayLogoUrlSchema } from "@/utils/schemas/customer-display";
import { logger, safeStringify } from "@/utils/logger";
import type { UserPreferences } from "@/types/preferences";

/** Settings → Customer display saved: reopen against the new settings. */
export const CUSTOMER_DISPLAY_CONFIG_CHANGED_EVENT = "customer-display-config-changed";

/** Checked this often, so an unplugged screen closes and a replugged one comes back. */
const MONITOR_CHECK_MS = 5_000;

const cartSource: CartSource = {
  getItems: () => useCartStore.getState().items,
  getTotals: () => cartTotals(useCartStore.getState()),
  subscribe: (listener) =>
    useCartStore.subscribe((state, previous) => {
      if (state.items !== previous.items) listener();
    }),
};

const isTauri = () => "__TAURI_INTERNALS__" in window;

const DARK_QUERY = "(prefers-color-scheme: dark)";
const subscribeSystemDark = (onChange: () => void) => {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const systemIsDark = () => window.matchMedia(DARK_QUERY).matches;

async function invoke(command: string, args?: Record<string, unknown>) {
  const { invoke: call } = await import("@tauri-apps/api/core");
  return call(command, args);
}

/**
 * Runs the customer display for the logged-in till: keeps its window on the chosen
 * monitor and feeds it the sale. Mounted with the till's layout, so logging out closes it.
 */
export function useCustomerDisplay(): void {
  const { i18n } = useTranslation();
  const themeMode = useTheme((state) => state.themeMode);
  // From the setting and the OS, as the till decides its own theme; the page's class may not be applied yet.
  const systemDark = useSyncExternalStore(subscribeSystemDark, systemIsDark);
  const theme = themeMode === "dark" || (themeMode === "system" && systemDark) ? "dark" : "light";
  const { data: store } = useQueryStore();
  const { data: regionData } = useQueryRegion();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const { data: vatRate } = useQueryVatRate();

  useEffect(() => {
    const load = () =>
      void loadPreferences()
        .then(setPrefs)
        .catch((error: unknown) => void logger.warn(`Customer display settings unread: ${safeStringify(error)}`));
    load();
    window.addEventListener(CUSTOMER_DISPLAY_CONFIG_CHANGED_EVENT, load);
    return () => window.removeEventListener(CUSTOMER_DISPLAY_CONFIG_CHANGED_EVENT, load);
  }, []);

  const display = prefs?.customerDisplay;
  const monitor = display?.enabled ? display.monitor : null;
  const enabled = monitor !== null && isTauri();

  useEffect(() => {
    if (!enabled || !monitor) return;
    const ensure = () =>
      void invoke("ensure_customer_display", { monitor }).catch(
        (error: unknown) => void logger.warn(`Customer display did not open: ${safeStringify(error)}`)
      );
    ensure();
    const timer = setInterval(ensure, MONITOR_CHECK_MS);
    return () => {
      clearInterval(timer);
      void invoke("close_customer_display").catch(() => undefined);
    };
    // The monitor's fields, not the object: a re-read of the same settings must not reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, monitor?.name, monitor?.x, monitor?.y]);

  const language = display?.language === "till" || !display ? i18n.language : display.language;
  // No currency, no screen: money is never drawn in a guessed one.
  const currency = regionData?.defaultRegion?.currency_code?.toUpperCase();
  const logoUrl = getLogoUrl(store);
  const primaryColor = getPrimaryColor(store);
  const config: PublisherConfig | null =
    prefs && display && currency
      ? {
          branding: {
            storeName: getBrandName(store),
            ...(displayLogoUrlSchema.safeParse(logoUrl).success ? { logoUrl } : {}),
            ...(primaryColor ? { primaryColor: primaryColor.slice(0, 40) } : {}),
          },
          format: {
            currency,
            symbolPosition: prefs.currency.symbolPosition,
            decimalSeparator: prefs.currency.decimalSeparator,
            language,
            theme,
            pricesIncludeVat: pricesIncludeVat(vatRate),
            showImages: display.showImages,
          },
          thanksMs: display.thanksSeconds * 1000,
        }
      : null;
  const configKey = JSON.stringify(config);

  useEffect(() => {
    if (!enabled || !config) return;
    return startCustomerDisplayPublisher(tauriTransport, cartSource, config, (reason) => {
      void logger.error(`Customer display screen not sent, it breaks its contract: ${reason}`);
    });
    // Started once per enable; later changes go through configure below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, config === null]);

  useEffect(() => {
    if (config) configureCustomerDisplayPublisher(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);
}
