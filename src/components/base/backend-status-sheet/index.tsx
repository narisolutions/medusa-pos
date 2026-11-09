import React, { useEffect, useState } from "react";
import { CircleCheck, CircleAlert, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { getSdkBaseUrl } from "@/config/medusa";
import { useQueryBackendHealth } from "@/hooks/queries/useQueryBackendHealth";
import { useNow } from "@/hooks/ui/useNow";
import { useTranslation } from "@/i18n";
import { outageAge } from "@/utils/http/backend-probe";

// While the sheet is open it re-checks this often; the shared query keeps it to one at a time.
const SHEET_CHECK_EVERY_MS = 10_000;

interface Props {
  /** What opens the sheet: the header's status chip or the "connection lost" band. */
  children: React.ReactNode;
}

/** Says why the till can't reach the backend, in words staff can act on, with Retry now. */
const BackendStatusSheet: React.FC<Props> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">{open && <SheetBody />}</DialogContent>
    </Dialog>
  );
};

const SheetBody: React.FC = () => {
  const { t } = useTranslation();
  const health = useQueryBackendHealth({ intervalMs: SHEET_CHECK_EVERY_MS });
  const now = useNow(5_000);
  const data = health.data;

  // Opening the sheet is asking "how is it now?": don't show a check up to 30 s old.
  const { refetch } = health;
  useEffect(() => {
    void refetch({ cancelRefetch: false });
  }, [refetch]);
  const ok = data?.probe.kind === "ok";

  const age = (since: number) => {
    const parts = outageAge(now - since);
    if (!parts) return t("status.connection.just_now");
    const label = parts.hours
      ? t("status.connection.age_hours", parts)
      : t("status.connection.age_minutes", parts);
    return t("status.connection.ago", { age: label });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">{t("status.connection.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("status.connection.title")}</DialogDescription>
      </DialogHeader>

      {data ? (
        <div className="flex items-start gap-3 rounded-lg bg-surface-muted p-4">
          {ok ? (
            <CircleCheck className="size-6 shrink-0 text-success-text" aria-hidden />
          ) : (
            <CircleAlert className="size-6 shrink-0 text-danger-text" aria-hidden />
          )}
          <p className="text-base text-fg">
            {t(`status.connection.kind_${data.probe.kind}`, { status: data.probe.status ?? "" })}
          </p>
        </div>
      ) : (
        <StatusChip intent="neutral">{t("status.checking")}</StatusChip>
      )}

      <dl className="divide-y divide-theme-border text-base">
        <Row label={t("status.connection.server")}>
          <span className="break-all font-mono">{getSdkBaseUrl()}</span>
        </Row>
        {data?.probe.answeredBy && !ok && (
          <Row label={t("status.connection.answered_by")}>
            <span className="break-all">{data.probe.answeredBy}</span>
          </Row>
        )}
        <Row label={t("status.connection.last_answered")}>
          {data?.lastAnsweredAt ? age(data.lastAnsweredAt) : t("status.connection.never")}
        </Row>
        <Row label={t("status.connection.device")}>
          {navigator.onLine ? t("status.connection.device_online") : t("status.connection.device_offline")}
        </Row>
        {data && (
          <Row label={t("status.connection.checked")}>
            {age(data.checkedAt)} · {data.probe.elapsedMs} ms
          </Row>
        )}
      </dl>

      {data?.probe.detail && !ok && (
        <p className="break-all text-sm text-fg-subtle">{data.probe.detail}</p>
      )}

      <DialogFooter>
        <Button
          size="lg"
          className="w-full sm:w-auto"
          loading={health.isFetching}
          onClick={() => void health.refetch({ cancelRefetch: false })}
        >
          {!health.isFetching && <RefreshCw className="size-5" />}
          {t("status.connection.retry")}
        </Button>
      </DialogFooter>
    </>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex min-h-tap items-center justify-between gap-4 py-2">
    <dt className="shrink-0 text-fg-muted">{label}</dt>
    <dd className="min-w-0 text-right text-fg">{children}</dd>
  </div>
);

export default BackendStatusSheet;
