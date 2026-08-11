import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { logger, safeStringify } from "@/utils/logger";
import { t } from "@/i18n";
import type { ScannerPreferences } from "@/types/preferences";

const SCAN_EVENT = "pos-hardware://serial-scan";
const ERROR_EVENT = "pos-hardware://serial-error";

type SerialScan = {
  port: string;
  text: string;
  bytes: number[];
  terminatedBy: string;
};

type SerialError = {
  port: string;
  message: string;
};

interface UseSerialScannerProps {
  scanner: ScannerPreferences;
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

/**
 * Reads a scanner over its Virtual COM port. Unlike the keyboard-wedge path this
 * gets the bytes the scanner actually sent — no keyboard-layout rewriting, no
 * dependence on which field has focus, and alphanumeric/2D payloads survive.
 *
 * Dormant unless the operator has picked the `serial` transport and a port.
 */
const useSerialScanner = ({ scanner, onScan, enabled = true }: UseSerialScannerProps) => {
  const onScanRef = useRef(onScan);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onScanRef.current = onScan;
    enabledRef.current = enabled;
  });

  const { transport, port, baud, idleMs } = scanner;
  const active = transport === "serial" && !!port;

  useEffect(() => {
    if (!active || !port) return;

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const start = async () => {
      try {
        const [{ invoke }, { listen }] = await Promise.all([
          import("@tauri-apps/api/core"),
          import("@tauri-apps/api/event"),
        ]);

        unlisteners.push(
          await listen<SerialScan>(SCAN_EVENT, (event) => {
            if (disposed || !enabledRef.current) return;
            const text = event.payload.text.trim();
            if (text) onScanRef.current(text);
          })
        );

        // A reader stops when the device goes away; offer a retry rather than
        // leaving a scanner that looks dead.
        unlisteners.push(
          await listen<SerialError>(ERROR_EVENT, (event) => {
            if (disposed) return;
            void logger.warn(`Serial scanner error: ${safeStringify(event.payload)}`);
            toast.error(t("settings.scanner.reader_stopped"), {
              description: event.payload.message,
            });
          })
        );

        if (disposed) return;
        await invoke("open_serial_scanner", { path: port, baud, idleMs });
      } catch (error) {
        if (disposed) return;
        // open_error_hint already explains the Linux group-membership case, so
        // surface the backend message verbatim rather than a generic one.
        const message = error instanceof Error ? error.message : String(error);
        void logger.error(`Failed to open serial scanner: ${message}`);
        toast.error(t("settings.scanner.open_failed"), { description: message });
      }
    };

    void start();

    return () => {
      disposed = true;
      unlisteners.forEach((off) => off());
      void import("@tauri-apps/api/core")
        .then(({ invoke }) => invoke("close_serial_scanner", { path: port }))
        .catch((error) =>
          logger.warn(`Failed to close serial scanner: ${safeStringify(error)}`)
        );
    };
  }, [active, port, baud, idleMs]);
};

export { useSerialScanner };
export type { SerialScan, SerialError };
