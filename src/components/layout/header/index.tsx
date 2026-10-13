import { Calendar } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { useHeader } from "./hooks";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getBrandName, getLogoUrl } from "@/utils/settings/store/metadata";
import { useTranslation } from "@/i18n";
import StatusIndicators from "./status-indicators";

const Header: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const sidebar = useSidebar();
  const { data: store } = useQueryStore();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { formatDate } = useHeader();

  const logoSrc = getLogoUrl(store);

  return (
    // Three columns: the logo stays centred, and the status side wraps rather than running off-screen.
    <header className="bg-surface border-b border-theme-border shadow h-24 px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 shrink-0">
      {/* Folded, the sidebar's fold button sits here; keep the space so nothing slides under it. */}
      <div className={sidebar.open ? "" : "w-16 shrink-0"} />
      <div>
        {logoSrc ? (
          <img
            src={logoSrc}
            className="h-8 drop-shadow-lg"
            alt={getBrandName(store)}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-lg font-semibold text-foreground">
            {getBrandName(store) || t("common.pos")}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1">
        <StatusIndicators />
        <div className="flex gap-1.5 items-center whitespace-nowrap text-base text-fg-muted">
          <span>{formatDate(now)}</span>
          <Calendar />
        </div>
      </div>
    </header>
  );
};

export default Header;
