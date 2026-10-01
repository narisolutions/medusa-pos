import { logger, safeStringify } from "@/utils/logger";
import { AdminStore } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { useStore } from "@/context/store";
import { useSalesChannel } from "@/context/sales-channel";
import { useStoreManager } from "@/context/store-manager";
import storage from "@/utils/storage";
import { initDateTimePrefs, initCurrencyPrefs, loadPreferences } from "@/utils/settings/preferences";
import { queryClient, queryKeys } from "@/config/query";
import {
  getPrimaryColor,
  getSecondaryColor,
  getFontSize,
  getBrandName,
  getLogoUrl,
  hasPosMetadata,
} from "@/utils/settings/store/metadata";

const setOrClearProperty = (name: string, value: string | undefined) => {
  const style = document.documentElement.style;
  if (value) style.setProperty(name, value);
  else style.removeProperty(name);
};

async function initStoreSettings() {
  try {
    const { stores } = await getSdk().admin.store.list();
    const store = stores[0] as AdminStore | undefined;
    if (!store) return;

    const dismissed = await storage.getItem("store_setup_dismissed");
    useStore.getState().setNeedsSetup(!hasPosMetadata(store) && !dismissed);

    queryClient.setQueryData(queryKeys.store, store);

    await useStoreManager.getState().updateActiveName(store.name);
    await useStoreManager.getState().updateActiveLogo(getLogoUrl(store));

    const primaryColor = getPrimaryColor(store);
    const secondaryColor = getSecondaryColor(store);
    const fontScale = getFontSize(store);

    setOrClearProperty("--color-primary", primaryColor);
    setOrClearProperty("--color-secondary", secondaryColor);
    setOrClearProperty("--font-scale", fontScale);

    await storage.setItem("store_theme", {
      primaryColor: primaryColor ?? undefined,
      secondaryColor: secondaryColor ?? undefined,
      fontScale: fontScale ?? undefined,
      brandName: getBrandName(store) || undefined,
    });
  } catch (storeErr) {
    void logger.error(`Store settings init failed: ${safeStringify(storeErr)}`);
  }
}

async function initPreferences() {
  try {
    const prefs = await loadPreferences();
    initDateTimePrefs(prefs.dateTime);
    initCurrencyPrefs(prefs.currency);
  } catch (prefsErr) {
    void logger.error(`Preferences init failed: ${safeStringify(prefsErr)}`);
  }
}

async function initSalesChannel() {
  try {
    const storedId = await storage.getItem("sales_channel_id");
    let validId: string | undefined;

    if (storedId) {
      try {
        const { sales_channels } = await getSdk().admin.salesChannel.list();
        if (sales_channels.some((ch: { id: string }) => ch.id === storedId)) {
          validId = storedId;
        } else {
          await storage.setItem("sales_channel_id", "");
        }
      } catch {
        // Can't verify (offline, backend hiccup): keep the saved channel rather than lose it.
        validId = storedId;
      }
    }

    useSalesChannel.getState().setSalesChannelId(validId);
    useSalesChannel.getState().setNeedsWarning(!validId);
  } catch (scErr) {
    void logger.error(`Sales channel init failed: ${safeStringify(scErr)}`);
    useSalesChannel.getState().setNeedsWarning(true);
  }
}

// Post-auth init (store meta, theme, prefs, sales channel). Safe from boot and login
// flows. The three sections are independent, so they run together, and each handles
// its own failure — one can never block or fail the others.
export async function runPostAuthInit() {
  await Promise.all([initStoreSettings(), initPreferences(), initSalesChannel()]);
}
