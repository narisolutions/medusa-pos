import React from "react";
import { ChevronRight, WifiOff } from "lucide-react";
import BackendStatusSheet from "@/components/base/backend-status-sheet";
import { isLost, useQueryBackendHealth, type BackendHealth } from "@/hooks/queries/useQueryBackendHealth";
import { useNow } from "@/hooks/ui/useNow";
import { useTranslation } from "@/i18n";
import { outageAge } from "@/utils/http/backend-probe";

/** A red band under the header while the backend can't be reached; tapping it says why. */
const BackendLostBand: React.FC = () => {
  const { data } = useQueryBackendHealth();
  return isLost(data) ? <Band health={data} /> : null;
};

// Split off so the once-a-second clock only runs while the band is on screen.
const Band: React.FC<{ health: BackendHealth }> = ({ health }) => {
  const { t } = useTranslation();
  const now = useNow(1_000);

  const parts = health.lostSince ? outageAge(now - health.lostSince) : null;
  const label = parts
    ? t("status.connection.lost_for", {
        age: parts.hours ? t("status.connection.age_hours", parts) : t("status.connection.age_minutes", parts),
      })
    : t("status.connection.lost");

  return (
    <BackendStatusSheet>
      <button
        type="button"
        role="alert"
        className="flex min-h-tap-min w-full shrink-0 items-center gap-3 bg-danger px-6 text-left text-base font-semibold text-danger-foreground cursor-pointer active:opacity-90"
      >
        <WifiOff className="size-5 shrink-0" aria-hidden />
        <span className="flex-1">{label}</span>
        <span className="flex items-center gap-1 font-normal">
          {t("status.connection.details")}
          <ChevronRight className="size-5" aria-hidden />
        </span>
      </button>
    </BackendStatusSheet>
  );
};

export default BackendLostBand;
