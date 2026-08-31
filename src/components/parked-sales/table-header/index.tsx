import React from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";

interface Props {
  filters: { search: string };
  onFiltersChange: (filters: Props["filters"]) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Search only: parked sales have no status, and the sales channel is fixed by definition.
const Header: React.FC<Props> = ({
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <h1 className="text-2xl font-semibold text-fg">{t("parked.title")}</h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 md:w-96">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted" />
          <Input
            value={filters.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            placeholder={t("parked.search_placeholder")}
            className="pl-10 pr-10 text-base"
          />
          {filters.search && (
            <button
              type="button"
              aria-label={t("common.remove")}
              onClick={() => onFiltersChange({ ...filters, search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            aria-label={t("common.refresh")}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`size-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Header;
