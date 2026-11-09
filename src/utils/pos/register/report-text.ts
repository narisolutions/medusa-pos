import {
  centerText,
  padLine,
  PAPER_CONFIG,
  sanitizePrinterString,
  wrapText,
  type PaperWidth,
  type PrinterEncoding,
} from "@narisolutions/pos-toolkit/receipt-builder";
import { formatCurrencyRaw, formatDateTime, formatTimeOnly, formatWeekday } from "@/utils/settings/preferences";
import { fromMinorUnits, toMinorUnits } from "@/utils/pos/pricing";
import { movementTotals } from "@/utils/pos/register";
import { REPORT_TENDERS } from "@/utils/pos/register/report";
import { PAPER_CONFIG as RECEIPT_PDF } from "@/utils/pos/receipt";
import type { CountSum, RegisterSession, ReportTender, SessionReport } from "@/types/register";

export type ReportLabels = {
  xTitle: string;
  zTitle: string;
  reprint: string;
  voided: string;
  session: string;
  businessDay: string;
  opened: string;
  closed: string;
  asOf: string;
  cash: string;
  float: string;
  cashSales: string;
  cashRefunds: string;
  payins: string;
  drops: string;
  expected: string;
  counted: string;
  difference: string;
  over: string;
  short: string;
  balanced: string;
  reason: string;
  tenders: string;
  tender: Record<ReportTender, string>;
  total: string;
  unpaid: string;
  refunds: string;
  refundsCash: string;
  refundsOther: string;
  movements: string;
  noSales: string;
  movementType: Record<RegisterSession["movements"][number]["type"], string>;
  sales: string;
  cancelled: string;
  fiscalZRef: string;
  notRecorded: string;
};

/** One X or Z, ready to lay out. `session.report` is ignored for an X: its live figures come in `report`. */
export type ReportPaper = {
  kind: "x" | "z";
  session: RegisterSession;
  /** The X's live figures, or the Z's frozen ones; absent on a close made before snapshots existed. */
  report?: SessionReport;
  businessDay: string;
  headerLines: string[];
  currency: string;
  /** When this X was taken. */
  asOf?: Date;
  /** Set on every Z print after the first. */
  reprintAt?: Date;
  /** The language weekday names are written in. */
  locale?: string;
};

type LayoutOptions = { paperWidth?: PaperWidth; encoding?: PrinterEncoding };

/** The X/Z as fixed-width text for the receipt printer, its preview and its PDF. */
export function buildReportText(paper: ReportPaper, labels: ReportLabels, options: LayoutOptions = {}): string {
  const width = PAPER_CONFIG[options.paperWidth ?? "80mm"].lineWidth;
  const clean = (text: string) => sanitizePrinterString(text, options.encoding ?? "translit");
  const money = (amount: number) => formatCurrencyRaw(amount, paper.currency);
  const { session, report } = paper;

  const lines: string[] = [];
  const rule = () => lines.push("-".repeat(width));
  const center = (text: string) => wrapText(clean(text), width).forEach((l) => lines.push(centerText(l, width)));
  // A row too wide for the roll puts its value on the next line, right-aligned.
  const row = (label: string, right: string) => {
    const [l, r] = [clean(label), clean(right)];
    if (l.length + 1 + r.length <= width) lines.push(padLine(l, r, width));
    else lines.push(l, r.padStart(width));
  };
  const when = (date: Date | string) => `${formatWeekday(date, paper.locale)} ${formatDateTime(date)}`;
  const amountRow = (label: string, amount: number) => row(label, money(amount));
  const countRow = (label: string, { count, amount }: CountSum) => row(label, `${count}   ${money(amount)}`);
  const text = (value: string) => wrapText(clean(value), width).forEach((l) => lines.push(l));

  paper.headerLines.forEach(center);
  rule();
  center(paper.kind === "x" ? labels.xTitle : labels.zTitle);
  if (paper.reprintAt) center(`${labels.reprint} ${when(paper.reprintAt)}`);
  if (paper.kind === "z" && session.voided && session.voidedAt) {
    center(`${labels.voided} ${when(session.voidedAt)}`);
  }
  rule();
  row(labels.session, session.id);
  // The business day is a local calendar date; "T00:00" keeps it local rather than UTC.
  row(labels.businessDay, `${formatWeekday(`${paper.businessDay}T00:00`, paper.locale)} ${paper.businessDay}`);
  row(labels.opened, when(session.openedAt));
  if (paper.kind === "z" && session.closedAt) row(labels.closed, when(session.closedAt));
  if (paper.kind === "x") row(labels.asOf, when(paper.asOf ?? new Date()));
  rule();

  lines.push(clean(labels.cash));
  amountRow(labels.float, session.openingFloat);
  if (report) {
    amountRow(labels.cashSales, report.cash.cashSales);
    amountRow(labels.cashRefunds, -report.cash.cashRefunds);
    amountRow(labels.payins, report.cash.payins);
    amountRow(labels.drops, -report.cash.drops);
  } else {
    const { payins, drops } = movementTotals(session);
    row(labels.cashSales, labels.notRecorded);
    amountRow(labels.payins, payins);
    amountRow(labels.drops, -drops);
  }
  const expected = paper.kind === "z" ? (session.expectedCash ?? report?.cash.expected) : report?.cash.expected;
  if (expected != null) amountRow(labels.expected, expected);

  if (paper.kind === "z" && session.countedCash != null && session.difference != null) {
    amountRow(labels.counted, session.countedCash);
    const diff = session.difference;
    const word = diff === 0 ? labels.balanced : diff > 0 ? labels.over : labels.short;
    row(labels.difference, `${diff > 0 ? "+" : ""}${money(diff)} ${word}`);
    if (session.note) text(`${labels.reason}: ${session.note}`);
  }
  rule();

  lines.push(clean(labels.tenders));
  if (report) {
    for (const tender of REPORT_TENDERS) countRow(labels.tender[tender], report.tenders[tender]);
    const tenders = REPORT_TENDERS.map((t) => report.tenders[t]);
    countRow(labels.total, {
      count: tenders.reduce((sum, t) => sum + t.count, 0),
      amount: fromMinorUnits(tenders.reduce((sum, t) => sum + toMinorUnits(t.amount), 0)),
    });
    countRow(labels.unpaid, report.unpaid);
    rule();
    lines.push(clean(labels.refunds));
    countRow(labels.refundsCash, report.refunds.cash);
    countRow(labels.refundsOther, report.refunds.other);
  } else {
    text(labels.notRecorded);
  }
  rule();

  lines.push(clean(labels.movements));
  if (report) {
    countRow(labels.payins, report.movements.payins);
    countRow(labels.drops, report.movements.drops);
    row(labels.noSales, String(report.movements.noSales));
  }
  for (const m of session.movements) {
    const amount = m.type === "no_sale" ? "" : ` ${money(m.type === "drop" ? -m.amount : m.amount)}`;
    text(`${formatTimeOnly(m.at)} ${labels.movementType[m.type]}${amount} - ${m.reason}`);
  }
  rule();

  if (report) row(`${labels.sales} ${report.sales}`, `${labels.cancelled} ${report.cancelled}`);
  if (paper.kind === "z" && session.fiscalZRef) row(labels.fiscalZRef, session.fiscalZRef);

  return lines.join("\n");
}

const PT_TO_MM = 25.4 / 72;
// Courier glyphs are 0.6 em wide.
const COURIER_ADVANCE = 0.6;
const MAX_FONT_PT = 10;

export type ReportPdfLayout = {
  pageWidth: number;
  pageHeight: number;
  fontSize: number;
  lineHeight: number;
  x: number;
  top: number;
};

/** Sizes a receipt-width page so the longest line fits between equal margins. Millimetres, font in points. */
export function reportPdfLayout(lines: string[], paperWidth: PaperWidth = "80mm"): ReportPdfLayout {
  const { pdfPageWidth: pageWidth, pdfMargin: margin } = RECEIPT_PDF[paperWidth];
  const longest = Math.max(1, ...lines.map((line) => line.length));
  const fontSize = Math.min(MAX_FONT_PT, (pageWidth - 2 * margin) / (longest * COURIER_ADVANCE * PT_TO_MM));
  const textWidth = longest * COURIER_ADVANCE * fontSize * PT_TO_MM;
  const lineHeight = fontSize * PT_TO_MM * 1.25;
  const top = margin + lineHeight;
  return {
    pageWidth,
    pageHeight: top + Math.max(0, lines.length - 1) * lineHeight + 2 * margin,
    fontSize,
    lineHeight,
    x: (pageWidth - textWidth) / 2,
    top,
  };
}

/** The same fixed-width text on one receipt-width page, in a monospace font so the columns hold. */
export async function buildReportPdf(text: string, paperWidth: PaperWidth = "80mm"): Promise<Uint8Array> {
  // jsPDF is heavy — load it only when a PDF is actually exported.
  const { jsPDF } = await import("jspdf");
  const lines = text.split("\n");
  const { pageWidth, pageHeight, fontSize, lineHeight, x, top } = reportPdfLayout(lines, paperWidth);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [pageWidth, pageHeight] });
  doc.setFont("courier", "normal");
  doc.setFontSize(fontSize);
  lines.forEach((line, i) => doc.text(line, x, top + i * lineHeight));
  return new Uint8Array(doc.output("arraybuffer"));
}
