import { Calendar } from "lucide-react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { useHeader } from "./hooks";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getBrandName, getLogoUrl } from "@/utils/store/metadata";

const Header: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const sidebar = useSidebar();
  const { data: store } = useQueryStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { formatDate } = useHeader();

  const logoSrc = getLogoUrl(store);

  return (
    <header className="bg-surface border-b border-theme-border shadow h-24 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {!sidebar.open && <SidebarTrigger />}
      </div>
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
            {getBrandName(store) || "POS"}
          </span>
        )}
      </div>
      <div className="flex gap-1.5 items-center text-fg-muted">
        <span>{formatDate(now)}</span>
        <Calendar />
      </div>
    </header>
  );
};

export default Header;
