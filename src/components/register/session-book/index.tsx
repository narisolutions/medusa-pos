import { useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import ReportPreviewDialog from "@/components/register/report-preview-dialog";
import { useRegister } from "@/context/register";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { useTranslation } from "@/i18n";
import { formatPrice } from "@/utils/helpers";
import { businessDay } from "@/utils/pos/register";
import { formatDateTime, formatTimeOnly } from "@/utils/settings/preferences";
import type { RegisterSession } from "@/types/register";
import { useSessionBook } from "./hooks";

// A reopen before new-session reopen archived the same id twice; the close time tells them apart.
const rowKey = (s: RegisterSession) => `${s.id}:${s.closedAt ?? ""}`;

/** Register → History: this till's closed sessions, each opening its Z for a reprint. */
const SessionBook = () => {
  const { t } = useTranslation();
  const { cutoffHour } = useRegister();
  const { data: regionData } = useQueryRegion();
  const currency = regionData?.defaultRegion?.currency_code?.toUpperCase() ?? "USD";
  const { data: sessions = [], isLoading } = useSessionBook();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = sessions.find((s) => rowKey(s) === selectedKey) ?? null;

  const columns = [
    t("register.book.business_day"),
    t("register.book.opened_closed"),
    t("register.close.expected"),
    t("register.close.counted"),
    t("register.close.difference"),
    t("register.book.fiscal_z_ref"),
  ];

  return (
    <div className="bg-surface p-10 rounded-lg space-y-6 h-full flex flex-col">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-fg">{t("register.book.title")}</h1>
        <p className="text-base text-fg-muted">{t("register.book.description")}</p>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-theme-border overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Table>
            <TableHeader className="bg-surface-muted sticky top-0 z-10">
              <TableRow className="border-b border-theme-border hover:bg-transparent">
                {columns.map((label) => (
                  <TableHead key={label} className="text-base font-semibold text-fg-muted py-4 px-4 first:pl-6 last:pr-6">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-6">
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-6 text-center text-base text-fg-muted">
                    {t("register.book.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => {
                  const diff = session.difference ?? 0;
                  const Icon = diff === 0 ? CheckCircle2 : diff > 0 ? AlertTriangle : XCircle;
                  const tone = diff === 0 ? "text-success-text" : diff > 0 ? "text-warning-text" : "text-danger-text";
                  const word =
                    diff === 0 ? t("register.close.balanced") : diff > 0 ? t("register.close.over") : t("register.close.short");
                  return (
                    <TableRow
                      key={rowKey(session)}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedKey(rowKey(session))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedKey(rowKey(session));
                      }}
                      className="h-14 cursor-pointer border-b border-theme-border text-base hover:bg-surface-hover"
                    >
                      <TableCell className="px-4 pl-6 font-medium text-fg">
                        {businessDay(session.openedAt, cutoffHour)}
                        {session.voided && (
                          <span className="ml-2 rounded-md border border-danger px-2 py-0.5 text-base text-danger-text">
                            {t("register.report.voided")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 tabular-nums text-fg">
                        {formatDateTime(session.openedAt)} – {session.closedAt ? formatTimeOnly(session.closedAt) : "—"}
                      </TableCell>
                      <TableCell className="px-4 tabular-nums text-fg">
                        {session.expectedCash != null ? formatPrice(session.expectedCash, currency) : "—"}
                      </TableCell>
                      <TableCell className="px-4 tabular-nums text-fg">
                        {session.countedCash != null ? formatPrice(session.countedCash, currency) : "—"}
                      </TableCell>
                      <TableCell className={`px-4 tabular-nums ${tone}`}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-5" aria-hidden />
                          {diff > 0 ? "+" : ""}
                          {formatPrice(diff, currency)} {word}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 pr-6 text-fg">{session.fiscalZRef ?? "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ReportPreviewDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedKey(null)}
        kind="z"
        session={selected}
        report={selected?.report}
      />
    </div>
  );
};

export default SessionBook;
