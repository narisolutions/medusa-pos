import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { loadPreferences, updatePreferences } from "@/utils/settings/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/settings/preferences/defaults";
import { CUSTOMER_DISPLAY_CONFIG_CHANGED_EVENT } from "@/hooks/customer-display/useCustomerDisplay";
import { logger, safeStringify } from "@/utils/logger";
import type { CustomerDisplayMonitor, CustomerDisplayPreferences } from "@/types/preferences";
import type { DisplayState } from "@/types/customer-display";
import { pricesIncludeVat } from "@/utils/customer-display/vat";

/** A connected monitor, as `list_monitors` answers (camelCase over the wire). */
export type MonitorInfo = {
  name: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The till's own screen: shown, never offered. */
  isTill: boolean;
};

export const THANKS_SECONDS = [5, 8, 15, 30] as const;

export const sameMonitor = (a: CustomerDisplayMonitor | null, b: MonitorInfo) =>
  !!a && a.name === b.name && a.x === b.x && a.y === b.y;

async function listMonitors(): Promise<MonitorInfo[]> {
  if (!("__TAURI_INTERNALS__" in window)) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<MonitorInfo[]>("list_monitors");
}

export const useCustomerDisplaySettings = () => {
  const { t } = useTranslation();
  const [display, setDisplay] = useState<CustomerDisplayPreferences>(DEFAULT_PREFERENCES.customerDisplay);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanMonitors = useCallback(async () => {
    setIsScanning(true);
    try {
      setMonitors(await listMonitors());
    } catch (error) {
      void logger.warn(`Failed to list monitors: ${safeStringify(error)}`);
      toast.error(t("settings.customer_display.monitors_failed"));
    } finally {
      setIsScanning(false);
    }
  }, [t]);

  useEffect(() => {
    let ignore = false;
    loadPreferences()
      .then((prefs) => !ignore && setDisplay(prefs.customerDisplay))
      .catch((error: unknown) => void logger.warn(`Failed to load customer display settings: ${safeStringify(error)}`));
    listMonitors()
      .then((found) => !ignore && setMonitors(found))
      .catch((error: unknown) => void logger.warn(`Failed to list monitors: ${safeStringify(error)}`));
    return () => {
      ignore = true;
    };
  }, []);

  // Saved at once, like the scanner: each choice is a single tap, and the screen follows it live.
  const persist = useCallback(
    async (patch: Partial<CustomerDisplayPreferences>) => {
      setDisplay((current) => ({ ...current, ...patch }));
      try {
        await updatePreferences({ customerDisplay: patch });
        window.dispatchEvent(new Event(CUSTOMER_DISPLAY_CONFIG_CHANGED_EVENT));
      } catch (error) {
        void logger.error(`Failed to save customer display settings: ${safeStringify(error)}`);
        toast.error(t("settings.customer_display.save_failed"));
      }
    },
    [t]
  );

  const chooseMonitor = (monitor: MonitorInfo) =>
    void persist({ monitor: { name: monitor.name, x: monitor.x, y: monitor.y } });

  const savedConnected = display.monitor === null || monitors.some((monitor) => sameMonitor(display.monitor, monitor));

  return {
    display,
    monitors,
    isScanning,
    scanMonitors,
    savedConnected,
    chooseMonitor,
    setEnabled: (enabled: boolean) => void persist({ enabled }),
    setLanguage: (language: CustomerDisplayPreferences["language"]) => void persist({ language }),
    setShowImages: (showImages: boolean) => void persist({ showImages }),
    setThanksSeconds: (thanksSeconds: number) => void persist({ thanksSeconds }),
  };
};

/** A made-up cart for the settings preview, drawn by the same view the customer sees. */
export function previewState(
  display: CustomerDisplayPreferences,
  tillLanguage: string,
  storeName: string,
  currency: string,
  vatRate: number | undefined
): DisplayState {
  return {
    v: 1,
    seq: 1,
    sentAt: 0,
    phase: "cart",
    branding: { storeName },
    format: {
      currency,
      symbolPosition: "before",
      decimalSeparator: "dot",
      language: display.language === "till" ? tillLanguage : display.language,
      theme: "light",
      pricesIncludeVat: pricesIncludeVat(vatRate),
      showImages: false,
    },
    lines: [
      { key: "a", title: "Saperavi", subtitle: "2019/750", quantity: 2, unitPrice: 28, lineTotal: 56 },
      {
        key: "b",
        title: "Rkatsiteli",
        subtitle: "2021/750",
        quantity: 1,
        unitPrice: 18,
        originalUnitPrice: 20,
        lineTotal: 18,
        discountLabel: "−10%",
      },
    ],
    totals: { itemCount: 3, subtotal: 76, discount: 2, total: 74, hiddenLines: 0 },
  };
}
