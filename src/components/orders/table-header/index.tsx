import React from "react";
import { Search, X, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table as ReactTable } from "@tanstack/react-table";
import type { AdminOrder } from "@medusajs/types";
import { useQuerySalesChannel } from "@/hooks/queries/useQuerySalesChannel";
import { useTranslation } from "@/i18n";

interface Props {
  filters: {
    search: string;
    sales_channel: string;
    fulfillment_status: string;
    payment_status: string;
  };
  onFiltersChange: (filters: Props["filters"]) => void;
  table: ReactTable<AdminOrder>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const Header: React.FC<Props> = ({
  filters,
  onFiltersChange,
  table,
  onRefresh,
  isRefreshing = false,
}) => {
  const { data: rawChannels } = useQuerySalesChannel();
  const salesChannels = (rawChannels ?? []).filter((ch) => !ch.is_disabled);
  const { t } = useTranslation();

  const onGlobalFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });

    table.setGlobalFilter(value);
  };

  const onFulfillmentStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      fulfillment_status: value,
    });

    table.getColumn("fulfillment_status")?.setFilterValue(value || undefined);
  };

  const onSalesChannelChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sales_channel: value,
    });

    table.getColumn("sales_channel")?.setFilterValue(value || undefined);
  };

  const onPaymentStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      payment_status: value,
    });

    table.getColumn("payment_status")?.setFilterValue(value || undefined);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      sales_channel: "",
      fulfillment_status: "",
      payment_status: "",
    });

    table.setGlobalFilter("");
    table.resetColumnFilters();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-fg-subtle h-5 w-5" />
            <Input
              placeholder={t("orders.search_placeholder")}
              value={filters.search}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              className="pl-12 h-12 text-base w-full"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => onGlobalFilterChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {filters.search && (
            <>
              <div className="h-8 w-px bg-theme-border-strong"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-fg-muted">{t("orders.active_filter")}</span>
                <span className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm px-3 py-1.5 rounded-md">
                  {t("orders.filter_search_prefix")}"{filters.search}"
                  <X
                    className="h-3 w-3 cursor-pointer hover:bg-blue-200 rounded"
                    onClick={() => onGlobalFilterChange("")}
                  />
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-end">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-muted">{t("orders.fulfillment_label")}</span>
              <div className="w-52">
                <Select
                  value={filters.fulfillment_status || ""}
                  onValueChange={onFulfillmentStatusChange}
                >
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder={t("orders.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("orders.all")}</SelectItem>
                    <SelectItem value="not_fulfilled">{t("orders.status_not_fulfilled")}</SelectItem>
                    <SelectItem value="partially_fulfilled">{t("orders.status_partially_fulfilled")}</SelectItem>
                    <SelectItem value="fulfilled">{t("orders.status_fulfilled")}</SelectItem>
                    <SelectItem value="partially_shipped">{t("orders.status_partially_shipped")}</SelectItem>
                    <SelectItem value="shipped">{t("orders.status_shipped")}</SelectItem>
                    <SelectItem value="partially_delivered">{t("orders.status_partially_delivered")}</SelectItem>
                    <SelectItem value="delivered">{t("orders.status_delivered")}</SelectItem>
                    <SelectItem value="canceled">{t("orders.status_canceled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-muted">{t("orders.payment_label")}</span>
              <div className="w-44">
                <Select
                  value={filters.payment_status || ""}
                  onValueChange={onPaymentStatusChange}
                >
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder={t("orders.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("orders.all")}</SelectItem>
                    <SelectItem value="not_paid">{t("orders.filter_unpaid")}</SelectItem>
                    <SelectItem value="awaiting">{t("orders.status_awaiting")}</SelectItem>
                    <SelectItem value="captured">{t("orders.status_captured")}</SelectItem>
                    <SelectItem value="partially_captured">{t("orders.status_partially_captured")}</SelectItem>
                    <SelectItem value="refunded">{t("orders.status_refunded")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-muted">{t("orders.channel_label")}</span>
              <div className="w-44">
                <Select
                  value={filters.sales_channel || ""}
                  onValueChange={onSalesChannelChange}
                >
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder={t("orders.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("orders.all")}</SelectItem>
                    {salesChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.name}>
                        {ch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {onRefresh && (
              <Button
                variant="outline"
                size="lg"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-base h-12 px-6"
              >
                <RefreshCw
                  className={`h-5 w-5 mr-2 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                {isRefreshing ? t("common.refreshing") : t("common.refresh")}
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={clearAllFilters}
              className="text-base h-12 px-6"
            >
              {t("orders.clear_filters_button")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
