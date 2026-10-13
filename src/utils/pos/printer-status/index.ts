import type { StatusIntent } from "@/components/ui/status-chip";

/**
 * What a till can say about its printer right now. `connected` = the link opened but the
 * head doesn't answer status queries; `unsupported` = a system-spooler printer, which
 * reports on jobs, never on the head; `none` = no default printer set.
 */
type PrinterStatusKind =
  | "ready"
  | "connected"
  | "paper_low"
  | "paper_out"
  | "cover_open"
  | "error"
  | "offline"
  | "unreachable"
  | "unsupported"
  | "none";

/**
 * Reads the ESC/POS real-time status bytes (`DLE EOT 1` printer, `DLE EOT 4` paper).
 * Bits 1 and 4 are fixed high, so 0x12/0x16 means "nothing wrong". The most urgent
 * problem wins: a lifted cover or an empty roll stops printing, a low roll does not.
 */
const readPrinterStatus = (printer: number | null, paper: number | null): PrinterStatusKind => {
  if (printer === null && paper === null) return "connected";
  const p = printer ?? 0;
  const r = paper ?? 0;
  if (printer !== null && (p & 0x20) !== 0) return "cover_open";
  if ((r & 0x60) === 0x60) return "paper_out";
  if (printer !== null && (p & 0x40) !== 0) return "error";
  if (printer !== null && (p & 0x08) !== 0) return "offline";
  if ((r & 0x0c) === 0x0c) return "paper_low";
  return "ready";
};

const INTENTS: Record<PrinterStatusKind, StatusIntent> = {
  ready: "success",
  connected: "success",
  paper_low: "warning",
  paper_out: "danger",
  cover_open: "danger",
  error: "danger",
  offline: "danger",
  unreachable: "danger",
  unsupported: "neutral",
  none: "neutral",
};

const printerStatusIntent = (kind: PrinterStatusKind): StatusIntent => INTENTS[kind];

export { readPrinterStatus, printerStatusIntent };
export type { PrinterStatusKind };
