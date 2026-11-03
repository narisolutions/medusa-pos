import { describe, it, expect } from "vitest";
import type { RegisterSession, SessionReport } from "@/types/register";
import { buildReportText, reportPdfLayout, type ReportLabels, type ReportPaper } from "@/utils/pos/register/report-text";

const labels: ReportLabels = {
  xTitle: "X REPORT",
  zTitle: "Z (NON-FISCAL)",
  reprint: "REPRINT",
  voided: "VOIDED",
  session: "Session",
  businessDay: "Business day",
  opened: "Opened",
  closed: "Closed",
  asOf: "As of",
  cash: "CASH",
  float: "Float",
  cashSales: "Cash sales",
  cashRefunds: "Cash refunds",
  payins: "Pay-ins",
  drops: "Drops",
  expected: "Expected",
  counted: "Counted",
  difference: "Over/Short",
  over: "OVER",
  short: "SHORT",
  balanced: "BALANCED",
  reason: "Reason",
  tenders: "PAYMENTS",
  tender: { cash: "Cash", card: "Card", bank_transfer: "Bank transfer", transfer: "Internal transfer" },
  total: "Total",
  unpaid: "Unpaid",
  refunds: "REFUNDS",
  refundsCash: "Cash",
  refundsOther: "Other",
  movements: "MOVEMENTS",
  noSales: "No-sales",
  movementType: { payin: "Pay-in", drop: "Drop", no_sale: "No-sale" },
  sales: "Sales",
  cancelled: "Cancelled",
  fiscalZRef: "Cash register Z",
  notRecorded: "not recorded",
};

const zero = { count: 0, amount: 0 };

const report: SessionReport = {
  cash: { openingFloat: 50, cashSales: 420, cashRefunds: 12, payins: 10, drops: 100, expected: 368 },
  tenders: { cash: { count: 18, amount: 420 }, card: { count: 25, amount: 910.5 }, bank_transfer: zero, transfer: zero },
  unpaid: zero,
  refunds: { cash: { count: 1, amount: 12 }, other: zero },
  movements: { payins: { count: 1, amount: 10 }, drops: { count: 1, amount: 100 }, noSales: 2 },
  sales: 43,
  cancelled: 1,
};

const closed: RegisterSession = {
  id: "reg_1",
  status: "closed",
  openedAt: "2026-10-28T09:00:00.000Z",
  openingFloat: 50,
  movements: [
    { id: "m1", type: "drop", amount: 100, reason: "to the safe", at: "2026-10-28T13:00:00.000Z" },
    { id: "m2", type: "no_sale", amount: 0, reason: "change for a note", at: "2026-10-28T14:00:00.000Z" },
  ],
  closedAt: "2026-10-28T18:30:00.000Z",
  countedCash: 366,
  expectedCash: 368,
  difference: -2,
  note: "miscount on change",
  fiscalZRef: "0412",
  report,
};

const paper = (over: Partial<ReportPaper> = {}): ReportPaper => ({
  kind: "z",
  session: closed,
  report,
  businessDay: "2026-10-28",
  headerLines: ["Wine Shop"],
  currency: "GEL",
  ...over,
});

const lineWith = (text: string, label: string) => text.split("\n").find((l) => l.startsWith(label)) ?? "";

describe("buildReportText", () => {
  it("prints a Z with the close block, the word for the difference and the cash register's Z", () => {
    const text = buildReportText(paper(), labels);
    expect(text).toContain("Z (NON-FISCAL)");
    expect(lineWith(text, "Counted")).toMatch(/366/);
    expect(lineWith(text, "Over/Short")).toMatch(/-2.*SHORT$/);
    expect(text).toContain("Reason: miscount on change");
    expect(lineWith(text, "Cash register Z")).toMatch(/0412$/);
  });

  it("prints zero tenders rather than leaving them out", () => {
    const text = buildReportText(paper(), labels);
    expect(lineWith(text, "Bank transfer")).toMatch(/0 +0/);
    expect(lineWith(text, "Internal transfer")).toMatch(/0 +0/);
    expect(lineWith(text, "Total")).toMatch(/43 +1,?330/);
  });

  it("lists each movement with its reason, a no-sale without an amount", () => {
    const text = buildReportText(paper(), labels);
    expect(text).toMatch(/Drop -100.* - to the safe/);
    expect(text).toMatch(/No-sale - change for a note/);
  });

  it("leaves the count, over/short and the cash register's Z off an X", () => {
    const open: RegisterSession = { ...closed, status: "open", closedAt: undefined, countedCash: undefined, difference: undefined };
    const text = buildReportText(paper({ kind: "x", session: open, asOf: new Date("2026-10-28T15:00:00Z") }), labels);
    expect(text).toContain("X REPORT");
    expect(text).not.toContain("Counted");
    expect(text).not.toContain("Cash register Z");
    expect(lineWith(text, "Expected")).toMatch(/368/);
  });

  it("marks a reprint", () => {
    expect(buildReportText(paper({ reprintAt: new Date() }), labels)).toContain("REPRINT");
  });

  it("marks what a close made before snapshots did not record, and never makes it up", () => {
    const legacy = { ...closed, report: undefined, fiscalZRef: undefined };
    const text = buildReportText(paper({ session: legacy, report: undefined }), labels);
    expect(lineWith(text, "Cash sales")).toMatch(/not recorded$/);
    expect(text).not.toContain("Card");
    expect(lineWith(text, "Expected")).toMatch(/368/);
  });

  it("keeps every line inside a 57mm roll", () => {
    const text = buildReportText(paper(), labels, { paperWidth: "57mm" });
    for (const line of text.split("\n")) expect(line.length).toBeLessThanOrEqual(32);
  });

  it("says which weekday the business day was", () => {
    const text = buildReportText(paper({ locale: "en" }), labels);
    expect(text).toMatch(/Business day\s+Wed 2026-10-28/);
  });

  it("drops a value to its own line when label and value overflow a 57mm roll", () => {
    const long = { ...labels, opened: "Mdgomareobit gaikhsna", closed: "Mdgomareobit dakhurda" };
    const text = buildReportText(paper({ locale: "en", reprintAt: new Date() }), { ...long, reprint: "KHELAKHALI BECHDVA" }, {
      paperWidth: "57mm",
    });
    for (const line of text.split("\n")) expect(line.length).toBeLessThanOrEqual(32);
    expect(text).toMatch(/Mdgomareobit gaikhsna\n\s+\w{3} \S+ \S+/);
  });
});

describe("reportPdfLayout", () => {
  const COURIER_MM_PER_PT = 0.6 * (25.4 / 72);
  const lines = (count: number, width = 48) => Array.from({ length: count }, () => "x".repeat(width));
  const textWidth = (layout: ReturnType<typeof reportPdfLayout>, longest: number) =>
    longest * COURIER_MM_PER_PT * layout.fontSize;

  it("centres the text block with equal margins", () => {
    const layout = reportPdfLayout(lines(10), "80mm");
    const right = layout.pageWidth - layout.x - textWidth(layout, 48);
    expect(layout.x).toBeGreaterThan(0);
    expect(right).toBeCloseTo(layout.x, 6);
  });

  it("fits the longest line inside the page margins", () => {
    for (const paperWidth of ["80mm", "57mm"] as const) {
      const layout = reportPdfLayout(lines(5, paperWidth === "80mm" ? 48 : 32), paperWidth);
      expect(layout.x).toBeGreaterThanOrEqual(3 - 1e-9);
      expect(layout.x + textWidth(layout, paperWidth === "80mm" ? 48 : 32)).toBeLessThanOrEqual(layout.pageWidth);
    }
  });

  it("uses the receipt page width for each roll", () => {
    expect(reportPdfLayout(lines(5), "80mm").pageWidth).toBe(80);
    expect(reportPdfLayout(lines(5, 32), "57mm").pageWidth).toBe(58);
  });

  it("caps the font for short lines", () => {
    expect(reportPdfLayout(["short"], "80mm").fontSize).toBe(10);
  });

  it("grows the page with the line count", () => {
    const short = reportPdfLayout(lines(10), "80mm");
    const long = reportPdfLayout(lines(40), "80mm");
    expect(long.pageHeight - short.pageHeight).toBeCloseTo(30 * short.lineHeight, 6);
  });
});
