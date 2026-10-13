import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "@/config/query";
import storage from "@/utils/storage";
import { readPrinterStatus, type PrinterStatusKind } from "@/utils/pos/printer-status";
import type { Printer } from "@/components/settings/printer/hooks";

const CHECK_EVERY_MS = 60_000;

/** Asks one printer how it is; any failure to reach it reads as unreachable. */
const fetchPrinterStatus = async (printer: Printer): Promise<PrinterStatusKind> => {
  if (printer.connectionType === "local") return "unsupported";
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const bytes = await invoke<{ printer: number | null; paper: number | null }>("query_printer_status", {
      connectionType: printer.connectionType,
      address: printer.address,
      port: printer.port || null,
      vendorId: printer.vendorId ?? null,
      productId: printer.productId ?? null,
    });
    return readPrinterStatus(bytes.printer, bytes.paper);
  } catch {
    return "unreachable";
  }
};

/**
 * Live status of one printer, or of the till's default printer when none is given
 * (read from storage on each check, so a changed default is picked up). Checked once a
 * minute: often enough to catch an empty roll before the next sale, rarely enough not
 * to compete with printing on a single-socket head.
 */
const usePrinterStatus = (printer?: Printer): UseQueryResult<PrinterStatusKind, Error> =>
  useQuery<PrinterStatusKind, Error>({
    queryKey: queryKeys.printerStatus(printer?.id ?? "default"),
    queryFn: async () => {
      const target =
        printer ?? (await storage.getItem<Printer[]>("printers"))?.find((p) => p.isDefault) ?? null;
      return target ? fetchPrinterStatus(target) : "none";
    },
    refetchInterval: CHECK_EVERY_MS,
    refetchIntervalInBackground: true,
    retry: false,
  });

export { usePrinterStatus };
