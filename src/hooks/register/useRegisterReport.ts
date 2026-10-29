import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { useRegister } from "@/context/register";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { openDownloadsFolder } from "@/utils/downloads";
import { getBrandName, getLogoUrl } from "@/utils/settings/store/metadata";
import { logger, safeStringify } from "@/utils/logger";
import { businessDay } from "@/utils/pos/register";
import { buildReportPdf, buildReportText, type ReportLabels, type ReportPaper } from "@/utils/pos/register/report-text";
import type { PrinterEncoding } from "@/utils/pos/receipt/printer-encoding";
import type { RegisterSession, SessionReport } from "@/types/register";

type PaperInput = {
  kind: ReportPaper["kind"];
  session: RegisterSession;
  report?: SessionReport | null;
  reprint?: boolean;
};

/** Lays out, prints and saves the register's X and Z with this till's printer, store and language. */
const useRegisterReport = () => {
  const { t, i18n } = useTranslation();
  const { cutoffHour } = useRegister();
  const { printReceiptText, getDefaultPrinter } = usePrinterService();
  const { data: store } = useQueryStore();
  const { data: regionData } = useQueryRegion();
  const currency = regionData?.defaultRegion?.currency_code?.toUpperCase() ?? "USD";

  const labels = useMemo<ReportLabels>(
    () => ({
      xTitle: t("register.report.x_title"),
      zTitle: t("register.report.z_title"),
      reprint: t("register.report.reprint"),
      voided: t("register.report.voided"),
      session: t("register.report.session"),
      businessDay: t("register.report.business_day"),
      opened: t("register.report.opened"),
      closed: t("register.report.closed"),
      asOf: t("register.report.as_of"),
      cash: t("register.report.cash"),
      float: t("register.report.float"),
      cashSales: t("register.report.cash_sales"),
      cashRefunds: t("register.report.cash_refunds"),
      payins: t("register.report.payins"),
      drops: t("register.report.drops"),
      expected: t("register.close.expected"),
      counted: t("register.close.counted"),
      difference: t("register.close.difference"),
      over: t("register.close.over"),
      short: t("register.close.short"),
      balanced: t("register.close.balanced"),
      reason: t("register.close.reason"),
      tenders: t("register.report.tenders"),
      tender: {
        cash: t("register.report.tender_cash"),
        card: t("register.report.tender_card"),
        bank_transfer: t("register.report.tender_bank_transfer"),
        transfer: t("register.report.tender_transfer"),
      },
      total: t("register.report.total"),
      unpaid: t("register.report.unpaid"),
      refunds: t("register.report.refunds"),
      refundsCash: t("register.report.refunds_cash"),
      refundsOther: t("register.report.refunds_other"),
      movements: t("register.report.movements"),
      noSales: t("register.report.no_sales"),
      movementType: {
        payin: t("register.report.movement_payin"),
        drop: t("register.report.movement_drop"),
        no_sale: t("register.report.movement_no_sale"),
      },
      sales: t("register.report.sales"),
      cancelled: t("register.report.cancelled"),
      fiscalZRef: t("register.report.fiscal_z_ref"),
      notRecorded: t("register.report.not_recorded"),
    }),
    [t]
  );

  const buildText = useCallback(
    ({ kind, session, report, reprint }: PaperInput, layout: "printer" | "pdf" = "printer") => {
      const printer = getDefaultPrinter();
      const encoding = (printer as { encoding?: PrinterEncoding } | null)?.encoding ?? "translit";
      return buildReportText(
        {
          kind,
          session,
          report: report ?? undefined,
          businessDay: businessDay(session.openedAt, cutoffHour),
          headerLines: [store?.name ?? ""].filter(Boolean),
          currency,
          asOf: kind === "x" ? new Date() : undefined,
          reprintAt: reprint ? new Date() : undefined,
          locale: i18n.language,
        },
        labels,
        // The PDF's fonts are Latin-only, so it is always transliterated.
        layout === "pdf"
          ? { paperWidth: "80mm", encoding: "translit" }
          : { paperWidth: printer?.paperWidth ?? "80mm", encoding }
      );
    },
    [getDefaultPrinter, cutoffHour, store, currency, labels, i18n.language]
  );

  /** Prints on the default printer; false (with a toast) when there is none or it fails. */
  const print = useCallback(
    async (input: PaperInput): Promise<boolean> => {
      if (!getDefaultPrinter()) {
        toast.error(t("register.report.print_failed"), { description: t("checkout.no_default_printer") });
        return false;
      }
      try {
        await printReceiptText(buildText(input));
        return true;
      } catch (error) {
        void logger.error(`Register report print failed: ${safeStringify(error)}`);
        toast.error(t("register.report.print_failed"));
        return false;
      }
    },
    [getDefaultPrinter, printReceiptText, buildText, t]
  );

  const savePdf = useCallback(
    async (input: PaperInput) => {
      try {
        const bytes = await buildReportPdf(buildText(input, "pdf"));
        const stamp = (input.session.closedAt ?? new Date().toISOString()).replace(/[-:T]/g, "").slice(0, 12);
        const filename = `register-${input.kind}-${stamp}.pdf`;
        const fs = await import("@tauri-apps/plugin-fs");
        await fs.writeFile(filename, bytes, { baseDir: fs.BaseDirectory.Download });
        toast.success(t("printer_service.receipt_saved_success", { filename }), {
          description: t("printer_service.saved_to_downloads"),
          action: {
            label: t("printer_service.open_folder_button"),
            onClick: () => openDownloadsFolder(filename),
          },
        });
      } catch (error) {
        void logger.error(`Register report PDF failed: ${safeStringify(error)}`);
        toast.error(t("printer_service.save_pdf_error_title"), {
          description: t("printer_service.save_pdf_error_message"),
        });
      }
    },
    [buildText, t]
  );

  /** What ReceiptPreview needs to draw the paper as this till's printer would. */
  const preview = {
    paperWidth: getDefaultPrinter()?.paperWidth ?? "80mm",
    logoSrc: getLogoUrl(store) ?? null,
    companyName: getBrandName(store) || "POS",
  } as const;

  return { buildText, print, savePdf, preview, currency };
};

export { useRegisterReport };
