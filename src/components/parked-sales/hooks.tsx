import { createColumnHelper } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminDraftOrder } from "@medusajs/types";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { formatDate, formatPrice, getOrderCurrency } from "@/utils/helpers";
import { useQueryDraftOrders } from "@/hooks/queries/useQueryDraftOrders";
import { useDebounce } from "@/hooks/ui/useDebounce";
import { useCartStore } from "@/context/cart";
import storage from "@/utils/storage";

const columnHelper = createColumnHelper<AdminDraftOrder>();

/** The operator's name for a parked sale, falling back to its reference number. */
const parkLabelOf = (draftOrder: AdminDraftOrder): string =>
  ((draftOrder.metadata?.park_label as string | undefined) || "").trim() ||
  `#${draftOrder.display_id}`;

const customerOf = (draftOrder: AdminDraftOrder): string => {
  const customer = draftOrder.customer;
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ");
  return name || customer?.email || draftOrder.email || "—";
};

/** Coarse "12 min ago" — precise enough to judge staleness. Pure, so the caller translates. */
const relativeParts = (iso: string | Date): { key: string; value: number } => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return { key: "parked.just_now", value: 0 };
  if (minutes < 60) return { key: "parked.minutes_ago", value: minutes };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { key: "parked.hours_ago", value: hours };
  return { key: "parked.days_ago", value: Math.round(hours / 24) };
};

interface UseParkedSalesColumnsProps {
  onResume: (draftOrder: AdminDraftOrder) => void;
  onDiscard: (draftOrder: AdminDraftOrder) => void;
  onOpen: () => void;
  busyId?: string;
}

const useParkedSalesColumns = ({
  onResume,
  onDiscard,
  onOpen,
  busyId,
}: UseParkedSalesColumnsProps) => {
  const { t } = useTranslation();
  const activeDraftOrderId = useCartStore((state) => state.draftOrderId);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => parkLabelOf(row), {
        id: "park_label",
        header: t("parked.column_label"),
        cell: (info) => {
          const isActive = info.row.original.id === activeDraftOrderId;
          return (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-fg text-base">{info.getValue()}</span>
              {isActive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-primary/10 text-primary border-primary/30">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {t("parked.active_here_badge")}
                </span>
              )}
            </div>
          );
        },
        filterFn: "includesString",
      }),
      columnHelper.accessor("display_id", {
        id: "display_id",
        header: t("parked.column_id"),
        cell: (info) => (
          <span className="text-base text-fg-muted">#{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("updated_at", {
        id: "updated_at",
        header: t("parked.column_parked_at"),
        cell: (info) => {
          const parkedAt = info.getValue() as string | Date;
          const relative = relativeParts(parkedAt);
          return (
            <div className="flex flex-col">
              <span className="text-base text-fg">{formatDate(parkedAt)}</span>
              <span className="text-xs text-fg-muted">
                {t(relative.key, { value: relative.value })}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => customerOf(row), {
        id: "customer",
        header: t("parked.column_customer"),
        cell: (info) => <span className="text-base text-fg">{info.getValue()}</span>,
        filterFn: "includesString",
      }),
      columnHelper.display({
        id: "item_count",
        header: t("parked.column_items"),
        cell: (info) => (
          <span className="text-base text-fg">
            {(info.row.original.items ?? []).reduce(
              (sum, item) => sum + item.quantity,
              0
            )}
          </span>
        ),
      }),
      columnHelper.accessor("total", {
        id: "total",
        header: t("parked.column_total"),
        cell: (info) => (
          <span className="font-semibold text-fg text-base">
            {formatPrice(info.getValue(), getOrderCurrency(info.row.original))}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: t("parked.column_actions"),
        cell: (info) => {
          const draftOrder = info.row.original;
          const isActive = draftOrder.id === activeDraftOrderId;
          const isBusy = busyId === draftOrder.id;

          return (
            // Rows are not clickable, so the actions must stop any bubbling themselves.
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                className="h-12 px-4 text-base"
                disabled={isBusy}
                onClick={() => (isActive ? onOpen() : onResume(draftOrder))}
              >
                {isActive ? t("parked.open_button") : t("parked.resume_button")}
              </Button>
              <Button
                variant="outline"
                className="h-12 px-4 text-base text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                disabled={isBusy}
                onClick={() => onDiscard(draftOrder)}
              >
                {t("parked.discard_button")}
              </Button>
            </div>
          );
        },
      }),
    ],
    [t, activeDraftOrderId, onResume, onDiscard, onOpen, busyId]
  );

  return { columns };
};

const defaultFilters = { search: "" };

const useParkedSalesWithData = () => {
  const [filters, setFilters] = useState(defaultFilters);
  // Keeps the search input responsive while the table refilter and the Tauri Store
  // write run once the operator pauses.
  const debouncedFilters = useDebounce(filters, 250);
  // Don't echo back the default on mount, nor the value just hydrated from storage.
  const userChangedFilters = useRef(false);

  const { data, isLoading, refetch, isFetching } = useQueryDraftOrders();

  const handleFiltersChange = useCallback((newFilters: typeof defaultFilters) => {
    setFilters((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newFilters)) {
        return prev;
      }
      userChangedFilters.current = true;
      return newFilters;
    });
  }, []);

  useEffect(() => {
    if (!userChangedFilters.current) return;
    void storage.setItem("parked_filters", debouncedFilters);
  }, [debouncedFilters]);

  useEffect(() => {
    let isMounted = true;

    const loadStoredFilters = async () => {
      const stored = await storage.getItem<typeof defaultFilters>("parked_filters");
      if (isMounted && stored) {
        setFilters((prev) =>
          JSON.stringify(prev) === JSON.stringify(stored) ? prev : stored
        );
      }
    };

    void loadStoredFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    data: data ?? [],
    isLoading,
    isFetching,
    refetch,
    filters,
    debouncedFilters,
    handleFiltersChange,
  };
};

export { useParkedSalesColumns, useParkedSalesWithData, parkLabelOf };
