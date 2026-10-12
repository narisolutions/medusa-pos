import React from "react";
import { Loader2, Wallet, Wifi, WifiOff } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { useQueryBackendHealth } from "@/hooks/queries/useQueryBackendHealth";
import { useRegister } from "@/context/register";
import { useTranslation } from "@/i18n";

/** The till's state on every page: can it reach the server, and can it take a sale. */
const StatusIndicators: React.FC = () => {
  const { t } = useTranslation();
  const health = useQueryBackendHealth();
  const { enabled: registerEnabled, isOpen: registerOpen } = useRegister();

  const online = health.data;
  const checking = health.isFetching && online === undefined;

  return (
    <div className="flex items-center gap-2">
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
      {registerEnabled && (
        <StatusChip intent={registerOpen ? "success" : "warning"} icon={<Wallet className="size-4" />}>
          {registerOpen ? t("status.register_open") : t("status.register_closed")}
        </StatusChip>
      )}
    </div>
  );
};

export default StatusIndicators;
