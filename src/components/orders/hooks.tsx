import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslation } from "@/i18n";
import {
  formatDate,
  formatPrice,
  getOrderCurrency,
  getOrderCustomerLabel,
} from "@/utils/helpers";
import { AdminOrder } from "@medusajs/types";
import { useQueryOrders } from "@/hooks/queries/useQueryOrders";
import { useDebounce } from "@/hooks/ui/useDebounce";
import storage from "@/utils/storage";
import { classifyOrderShippingMethod, getShippingMethodLabel } from "@/utils/pos/fulfillment";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getOrderPaymentMethodLabel } from "@/utils/pos/payment";
import { plugins } from "@/plugins";
import { Store, Truck } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import OrderStatusChip from "@/components/base/order-status-chip";

const columnHelper = createColumnHelper<AdminOrder>();

// Shown only when the list is wide enough (a container query, so it follows the till's
// Display size): at Large the rest of the row fits without scrolling sideways.
const OPTIONAL_COLUMN = "hidden @6xl:table-cell";

const useOrders = () => {
  const { t } = useTranslation();
  const { data: store } = useQueryStore();
  const columns = useMemo(
    () => [
      columnHelper.accessor("display_id", {
        id: "display_id",
        header: t("orders.column_order_id"),
        cell: (info) => (
          <span className="font-semibold text-fg text-base">
            #{info.getValue()}
          </span>
        ),
        filterFn: "includesString",
      }),
      columnHelper.display({
        id: "provider_name",
        header: t("orders.column_method"),
        meta: { className: OPTIONAL_COLUMN },
        cell: (info) => {
          const order = info.row.original;
          // A plugin's badge replaces the method: the order's source says how it leaves.
          const pluginBadge = plugins.map((plugin) => plugin.orderBadge?.(order)).find((badge) => badge != null);
          if (pluginBadge) return pluginBadge;

          const label = getShippingMethodLabel(order);
          if (!label) {
            return (
              <span className="text-base text-fg-muted" aria-label="No shipping method">
                —
              </span>
            );
          }

          const { isPickup } = classifyOrderShippingMethod(order);

          return (
            <StatusChip intent={isPickup ? "neutral" : "info"} icon={isPickup ? <Store className="size-4" /> : <Truck className="size-4" />}>
              {label}
            </StatusChip>
          );
        },
      }),
      columnHelper.accessor("created_at", {
        id: "created_at",
        header: t("orders.column_date"),
        cell: (info) => {
          return (
            <span className="text-base text-fg-muted">
              {formatDate(info.getValue())}
            </span>
          );
        },
        filterFn: "includesString",
      }),
      // Resolved, not raw email: a guest order's customer.email is the store's
      // own guest address.
      columnHelper.accessor((row) => getOrderCustomerLabel(row), {
        id: "customer_email",
        header: t("orders.column_customer"),
        cell: (info) => <span className="text-base break-all">{info.getValue()}</span>,
        filterFn: "includesString",
      }),
      columnHelper.accessor("sales_channel.name", {
        id: "sales_channel",
        header: t("orders.column_sales_channel"),
        cell: (info) => (
          <span className="text-base">{info.getValue() || "—"}</span>
        ),
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string;
          if (!value) return true;
          return rowValue === value;
        },
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: t("orders.column_status"),
        cell: (info) => <OrderStatusChip kind="order" status={info.getValue()} />,
        filterFn: "includesString",
      }),
      columnHelper.accessor("payment_status", {
        id: "payment_status",
        header: t("orders.column_payment"),
        cell: (info) => <OrderStatusChip kind="payment" status={info.getValue()} />,
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string;
          if (!value) return true; // Show all if no filter
          return rowValue === value; // Exact match
        },
      }),
      columnHelper.display({
        id: "payment_method",
        header: t("orders.payment_method_label"),
        meta: { className: OPTIONAL_COLUMN },
        cell: (info) => {
          const label = getOrderPaymentMethodLabel(info.row.original, store);
          if (!label) {
            return <span className="text-base text-fg-muted">—</span>;
          }
          return <span className="text-base text-fg">{label}</span>;
        },
      }),
      columnHelper.accessor("fulfillment_status", {
        id: "fulfillment_status",
        header: t("orders.column_fulfillment"),
        cell: (info) => <OrderStatusChip kind="fulfillment" status={info.getValue()} />,
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string;
          if (!value) return true; // Show all if no filter
          return rowValue === value; // Exact match
        },
      }),
      columnHelper.accessor("total", {
        id: "total",
        header: t("orders.column_total"),
        cell: (info) => {
          const value = info.getValue();
          const order = info.row.original;
          const currency = getOrderCurrency(order);

          return (
            <span className="font-semibold text-fg text-base tabular-nums">
              {formatPrice(value, currency)}
            </span>
          );
        },
      }),
    ],
    [t, store]
  );

  return { columns };
};

const useOrdersWithData = () => {
  const defaultFilters = {
    search: "",
    sales_channel: "",
    fulfillment_status: "",
    payment_status: "",
  };

  const [filters, setFilters] = useState(defaultFilters);
  // `filters` updates instantly (keeps the search input responsive); the expensive
  // consumers — the 500-row table refilter and the Tauri Store write — run off this
  // debounced value so they fire once the user pauses instead of per keystroke.
  const debouncedFilters = useDebounce(filters, 250);
  // Only persist filters the user actually changed — not the default on mount nor the
  // value just hydrated from storage (which would echo a redundant write).
  const userChangedFilters = useRef(false);

  const { data, isLoading, isError, refetch, isFetching } = useQueryOrders({
    // Load a sufficiently large page so filtering & pagination can be handled on the client
    limit: 500,
    offset: 0,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters((prev) => {
      // Only update if filters actually changed
      if (JSON.stringify(prev) === JSON.stringify(newFilters)) {
        return prev;
      }
      userChangedFilters.current = true;
      return newFilters;
    });
  }, []);

  useEffect(() => {
    if (!userChangedFilters.current) return;
    void storage.setItem("orders_filters", debouncedFilters);
  }, [debouncedFilters]);

  useEffect(() => {
    let isMounted = true;
    const loadStoredFilters = async () => {
      const storedFilters =
        await storage.getItem<typeof defaultFilters>("orders_filters");
      if (isMounted && storedFilters) {
        // Only set if different from current filters
        setFilters((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(storedFilters)) {
            return prev;
          }
          return storedFilters;
        });
      }
    };

    void loadStoredFilters();

    return () => {
      isMounted = false;
    };
  }, []);

  const { columns } = useOrders();

  const orders = data?.orders ?? [];

  return {
    data: orders,
    isLoading,
    // Only when nothing loaded: a failed refresh keeps the last good list on screen.
    loadFailed: isError && !data,
    filters,
    debouncedFilters,
    columns,
    handleFiltersChange,
    refetch,
    isFetching,
  };
};

export { useOrders, useOrdersWithData };
