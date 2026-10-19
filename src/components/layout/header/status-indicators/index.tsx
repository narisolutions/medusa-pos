import React from "react";
import { FlaskConical, Loader2, Wallet, Wifi, WifiOff } from "lucide-react";
import { useStoreManager } from "@/context/store-manager";
import { isStagingBackend } from "@/utils/auth/environment";
import { StatusChip } from "@/components/ui/status-chip";
import { useQueryBackendHealth } from "@/hooks/queries/useQueryBackendHealth";
import { useRegister } from "@/context/register";
import { useTranslation } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/router/routes";
import PrinterStatusChip from "@/components/base/printer-status-chip";

/** The till's state on every page: can it reach the server and the printer, and can it take a sale. */
const StatusIndicators: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const health = useQueryBackendHealth();
  const { enabled: registerEnabled, isOpen: registerOpen } = useRegister();

  const isStaging = isStagingBackend(useStoreManager((s) => s.activeStore?.backendUrl));
  const online = health.data;
  const checking = health.isFetching && online === undefined;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* So test sales on staging are never mistaken for real ones. */}
      {isStaging && (
        <StatusChip intent="warning" icon={<FlaskConical className="size-4" />} className="font-bold">
          {t("auth.staging")}
        </StatusChip>
      )}
      {/* Tapping re-checks now, e.g. after plugging the cable back in. */}
      <button
        type="button"
        onClick={() => void health.refetch()}
        aria-label={t("status.recheck")}
        className="flex min-h-tap items-center rounded-full cursor-pointer active:opacity-80"
      >
        {checking || online === undefined ? (
          <StatusChip intent="neutral" icon={<Loader2 className="size-4 animate-spin" />}>
            {t("status.checking")}
          </StatusChip>
        ) : online ? (
          <StatusChip intent="success" icon={<Wifi className="size-4" />}>
            {t("status.online")}
          </StatusChip>
        ) : (
          <StatusChip intent="danger" icon={<WifiOff className="size-4" />}>
            {t("status.offline")}
          </StatusChip>
        )}
      </button>
      {/* Opens the printer settings, where the problem gets fixed or tested. */}
      <button
        type="button"
        onClick={() => navigate(ROUTES.settingsSection("printer"))}
        aria-label={t("status.printer_open_settings")}
        className="flex min-h-tap items-center rounded-full cursor-pointer active:opacity-80"
      >
        <PrinterStatusChip hideUnknown />
      </button>
      {registerEnabled && (
        <StatusChip intent={registerOpen ? "success" : "warning"} icon={<Wallet className="size-4" />}>
          {registerOpen ? t("status.register_open") : t("status.register_closed")}
        </StatusChip>
      )}
    </div>
  );
};

export default StatusIndicators;
