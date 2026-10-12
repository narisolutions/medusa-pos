import React from "react";
import { Search, RefreshCw } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const Header: React.FC<Props> = ({
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing = false,
}) => {
  const { data: rawChannels } = useQuerySalesChannel();
  const salesChannels = (rawChannels ?? []).filter((ch) => !ch.is_disabled);
  const { t } = useTranslation();

  // These handlers only update `filters`; the table is synced from the debounced
  // filters in the parent, so the expensive refilter is deferred until typing pauses.
  const onGlobalFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };

  const onFulfillmentStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      fulfillment_status: value,
    });
  };

  const onSalesChannelChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sales_channel: value,
    });
  };

  const onPaymentStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      payment_status: value,
    });
  };

  // One-tap views over the same filters; anything else set by hand selects none of them.
  type QuickView = "all" | "unpaid" | "to_fulfil" | "custom";
  const quickView: QuickView =
    !filters.payment_status && !filters.fulfillment_status
      ? "all"
      : filters.payment_status === "not_paid" && !filters.fulfillment_status
        ? "unpaid"
        : filters.fulfillment_status === "not_fulfilled" && !filters.payment_status
          ? "to_fulfil"
          : "custom";

  const onQuickViewChange = (view: QuickView) => {
    onFiltersChange({
      ...filters,
      payment_status: view === "unpaid" ? "not_paid" : "",
      fulfillment_status: view === "to_fulfil" ? "not_fulfilled" : "",
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      sales_channel: "",
      fulfillment_status: "",
      payment_status: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle size-5" />
          <Input
            placeholder={t("orders.search_placeholder")}
            aria-label={t("orders.search_placeholder")}
            value={filters.search}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            clearable
            className="pl-12 w-full"
          />
        </div>
        {onRefresh && (
          <Button variant="outline" size="lg" onClick={onRefresh} disabled={isRefreshing} className="px-6">
            <RefreshCw className={`size-5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? t("common.refreshing") : t("common.refresh")}
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={clearAllFilters} className="px-6">
          {t("orders.clear_filters_button")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label={t("orders.quick_filter_label")}
          value={quickView}
          onChange={onQuickViewChange}
          options={[
            { value: "all", label: t("orders.all") },
            { value: "unpaid", label: t("orders.filter_unpaid") },
            { value: "to_fulfil", label: t("orders.filter_to_fulfil") },
          ]}
        />
        <div className="flex flex-wrap gap-3 items-center justify-end">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base text-fg-muted">{t("orders.fulfillment_label")}</span>
              <div className="w-52">
                <Select
                  value={filters.fulfillment_status || ""}
                  onValueChange={onFulfillmentStatusChange}
                >
                  <SelectTrigger className="text-base">
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
              <span className="text-base text-fg-muted">{t("orders.payment_label")}</span>
              <div className="w-44">
                <Select
                  value={filters.payment_status || ""}
                  onValueChange={onPaymentStatusChange}
                >
                  <SelectTrigger className="text-base">
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
              <span className="text-base text-fg-muted">{t("orders.channel_label")}</span>
              <div className="w-44">
                <Select
                  value={filters.sales_channel || ""}
                  onValueChange={onSalesChannelChange}
                >
                  <SelectTrigger className="text-base">
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

        </div>
      </div>
    </div>
  );
};

export default Header;
