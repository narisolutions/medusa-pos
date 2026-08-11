import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadPreferences, updatePreferences } from "@/utils/settings/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/settings/preferences/defaults";
import { SCANNER_CONFIG_CHANGED_EVENT } from "@/hooks/barcode/useScannerPreferences";
import type { SerialScan } from "@/hooks/barcode/useSerialScanner";
import { logger, safeStringify } from "@/utils/logger";
import { useTranslation } from "@/i18n";
import type { ScannerPreferences, ScannerTransport } from "@/types/preferences";

/** Mirrors the plugin's SerialPortInfo (camelCase over the wire). */
export interface SerialPortInfo {
  path: string;
  kind: string;
  vid?: number;
  pid?: number;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
  /** A USB or Bluetooth port rather than a legacy ttyS* — worth offering first. */
  likely: boolean;
  /** Linux /dev/serial/by-id/… — survives a replug, unlike ttyUSB0. */
  stablePath?: string;
}

/** Baud rates worth offering; 9600 is the common scanner default. */
export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;

export const useScannerSettings = () => {
  const { t } = useTranslation();

  const [scanner, setScanner] = useState<ScannerPreferences>(
    DEFAULT_PREFERENCES.scanner
  );
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [showAllPorts, setShowAllPorts] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testScans, setTestScans] = useState<SerialScan[]>([]);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadPreferences()
      .then((prefs) => setScanner(prefs.scanner))
      .catch((error) =>
        logger.warn(`Failed to load scanner preferences: ${safeStringify(error)}`)
      );
  }, []);

  const persist = useCallback(
    async (patch: Partial<ScannerPreferences>) => {
      const next = { ...scanner, ...patch };
      setScanner(next);
      try {
        await updatePreferences({ scanner: patch });
        // Reopen any live reader against the new settings.
        window.dispatchEvent(new Event(SCANNER_CONFIG_CHANGED_EVENT));
      } catch (error) {
        void logger.error(`Failed to save scanner preferences: ${safeStringify(error)}`);
        toast.error(t("settings.scanner.save_failed"));
      }
    },
    [scanner, t]
  );

  const handleTransportChange = useCallback(
    (transport: ScannerTransport) => void persist({ transport }),
    [persist]
  );

  const handlePortChange = useCallback(
    (port: string) => void persist({ port: port || undefined }),
    [persist]
  );

  const handleBaudChange = useCallback(
    (baud: number) => void persist({ baud }),
    [persist]
  );

  const handleIdleMsChange = useCallback(
    (idleMs: number) => void persist({ idleMs }),
    [persist]
  );

  const scanPorts = useCallback(async () => {
    setIsScanning(true);
    setPortError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const found = await invoke<SerialPortInfo[]>("list_serial_ports");
      setPorts(found);
      if (found.length === 0) setPortError(t("settings.scanner.no_ports"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPortError(message);
      setPorts([]);
    } finally {
      setIsScanning(false);
    }
  }, [t]);

  const stopTest = useCallback(async () => {
    unlistenRef.current?.();
    unlistenRef.current = null;
    setIsTesting(false);
    if (!scanner.port) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("close_serial_scanner", { path: scanner.port });
    } catch (error) {
      void logger.warn(`Failed to close test scanner: ${safeStringify(error)}`);
    }
  }, [scanner.port]);

  // Shows the raw capture — the only way to tell a mis-configured scanner
  // (wrong output encoding, wrong terminator) from a mis-configured app.
  const startTest = useCallback(async () => {
    if (!scanner.port) return;
    setTestScans([]);
    try {
      const [{ invoke }, { listen }] = await Promise.all([
        import("@tauri-apps/api/core"),
        import("@tauri-apps/api/event"),
      ]);
      unlistenRef.current = await listen<SerialScan>(
        "pos-hardware://serial-scan",
        (event) => setTestScans((prev) => [event.payload, ...prev].slice(0, 10))
      );
      await invoke("open_serial_scanner", {
        path: scanner.port,
        baud: scanner.baud,
        idleMs: scanner.idleMs,
      });
      setIsTesting(true);
    } catch (error) {
      unlistenRef.current?.();
      unlistenRef.current = null;
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("settings.scanner.open_failed"), { description: message });
    }
  }, [scanner.port, scanner.baud, scanner.idleMs, t]);

  useEffect(() => () => void unlistenRef.current?.(), []);

  const visiblePorts = showAllPorts ? ports : ports.filter((p) => p.likely);

  return {
    scanner,
    ports: visiblePorts,
    hiddenPortCount: ports.length - visiblePorts.length,
    showAllPorts,
    setShowAllPorts,
    isScanning,
    portError,
    scanPorts,
    handleTransportChange,
    handlePortChange,
    handleBaudChange,
    handleIdleMsChange,
    isTesting,
    testScans,
    startTest,
    stopTest,
  };
};
