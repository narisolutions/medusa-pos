import { useEffect, useState } from "react";
import { loadPreferences } from "@/utils/settings/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/settings/preferences/defaults";
import { logger, safeStringify } from "@/utils/logger";
import type { ScannerPreferences } from "@/types/preferences";

/**
 * Dispatched after scanner preferences are saved so an open reader is torn down
 * and reopened on the new port without a restart. Mirrors the register's
 * config-changed event.
 */
export const SCANNER_CONFIG_CHANGED_EVENT = "scanner-config-changed";

/** Current scanner settings, re-read when settings save. */
const useScannerPreferences = (): ScannerPreferences => {
  const [scanner, setScanner] = useState<ScannerPreferences>(
    DEFAULT_PREFERENCES.scanner
  );

  useEffect(() => {
    let cancelled = false;

    const read = () => {
      loadPreferences()
        .then((prefs) => {
          if (!cancelled) setScanner(prefs.scanner);
        })
        .catch((error) =>
          logger.warn(`Failed to load scanner preferences: ${safeStringify(error)}`)
        );
    };

    read();
    window.addEventListener(SCANNER_CONFIG_CHANGED_EVENT, read);
    return () => {
      cancelled = true;
      window.removeEventListener(SCANNER_CONFIG_CHANGED_EVENT, read);
    };
  }, []);

  return scanner;
};

export { useScannerPreferences };
