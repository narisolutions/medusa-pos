import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useMemo, useState, useCallback } from "react";
import { formatDate, formatPrice } from "@/utils/helpers";
import { AdminOrder } from "@medusajs/types";
import { useQueryOrders } from "@/hooks/queries/useQueryOrders";
import storage from "@/utils/storage";
import constants from "@/utils/constants";

const columnHelper = createColumnHelper<AdminOrder>();

const paymentStatusColors: Record<string, string> = {
  canceled: "bg-red-500",
  not_paid: "bg-gray-500",
  awaiting: "bg-yellow-500",
  authorized: "bg-yellow-500",
  partially_authorized: "bg-yellow-500",
  captured: "bg-green-500",
  partially_captured: "bg-green-400",
  partially_refunded: "bg-orange-500",
  refunded: "bg-red-500",
  requires_action: "bg-orange-500",
};

const orderStatusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  completed: "bg-green-500",
  draft: "bg-gray-500",
  archived: "bg-gray-600",
  canceled: "bg-red-500",
  requires_action: "bg-orange-500",
};

const fulfillmentStatusColors: Record<string, string> = {
  canceled: "bg-red-500",
  not_fulfilled: "bg-red-500",
  partially_fulfilled: "bg-yellow-500",
  fulfilled: "bg-green-500",
  partially_shipped: "bg-blue-500",
  shipped: "bg-blue-600",
  partially_delivered: "bg-yellow-500",
  delivered: "bg-green-600",
};

const getPaymentStatusColor = (status: string) => {
  const normalized = status.toLowerCase();
  return paymentStatusColors[normalized] || "bg-gray-400";
};

const getOrderStatusColor = (status: string) => {
  const normalized = status.replace(/_/g, " ").toLowerCase();
  return orderStatusColors[normalized] || "bg-gray-400";
};

const getFulfillmentStatusColor = (status: string) => {
  const normalized = status.toLowerCase();
  return fulfillmentStatusColors[normalized] || "bg-gray-400";
};

const useOrders = () => {
  const columns = useMemo(
    () => [
      columnHelper.accessor("display_id", {
        id: "display_id",
        header: "Order ID",
        cell: (info) => (
          <span className="font-semibold text-fg text-base">
            #{info.getValue()}
          </span>
        ),
        filterFn: "includesString",
      }),
      columnHelper.display({
        id: "provider_name",
        header: "Method",
        cell: (info) => {
          const order = info.row.original;
          const shippingMethods = order.shipping_methods?.[0] as
            | { name?: string }
            | undefined;
          const providerName = shippingMethods?.name?.toLowerCase();
          console.log(providerName);

          if (providerName === "quickshipper shipping") {
            return (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200">
                QuickShipper
              </span>
            );
          }

          if (providerName === "pickup") {
            return (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-purple-100 text-purple-700 border-purple-200">
                Pickup
              </span>
            );
          }

          return null;
        },
      }),
      columnHelper.accessor("created_at", {
        id: "created_at",
        header: "Date",
        cell: (info) => {
          return (
            <span className="text-base text-fg-muted">
              {formatDate(info.getValue())}
            </span>
          );
        },
        filterFn: "includesString",
      }),
      columnHelper.accessor("customer.email", {
        id: "customer_email",
        header: "Customer",
        cell: (info) => (
          <span className="text-base">{info.getValue() || "—"}</span>
        ),
        filterFn: "includesString",
      }),
      columnHelper.accessor("sales_channel.name", {
        id: "sales_channel",
        header: "Sales Channel",
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
        header: "Status",
        cell: (info) => {
          const value = info.getValue();
          const display =
            value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
          const colorClass = getOrderStatusColor(value);
          return (
            <div className="flex items-center gap-2">
              <span
                className={`${colorClass} w-3 h-3 rounded-full shrink-0`}
              />
              <span className="text-base">{display}</span>
            </div>
          );
        },
        filterFn: "includesString",
      }),
      columnHelper.accessor("payment_status", {
        id: "payment_status",
        header: "Payment",
        cell: (info) => {
          const value = info.getValue();
          const display =
            value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
          const colorClass = getPaymentStatusColor(value);
          return (
            <div className="flex items-center gap-2">
              <span
                className={`${colorClass} w-3 h-3 rounded-full shrink-0`}
              />
              <span className="text-base">{display}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("fulfillment_status", {
        id: "fulfillment_status",
        header: "Fulfillment",
        cell: (info) => {
          const value = info.getValue();
          const display =
            value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
          const colorClass = getFulfillmentStatusColor(value);
          return (
            <div className="flex items-center gap-2">
              <span
                className={`${colorClass} w-3 h-3 rounded-full shrink-0`}
              />
              <span className="text-base">{display}</span>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          const rowValue = row.getValue(id) as string;
          if (!value) return true; // Show all if no filter
          return rowValue === value; // Exact match
        },
      }),
      columnHelper.accessor("total", {
        id: "total",
        header: "Order Total",
        cell: (info) => {
          const value = info.getValue();
          const order = info.row.original;
          const currency = order.currency_code || constants.CHECKOUT_CONFIG.CURRENCY;

          return (
            <span className="font-semibold text-fg text-base">
              {formatPrice(value, currency)}
            </span>
          );
        },
      }),
    ],
    []
  );

  return { columns };
};

const useOrdersWithData = () => {
  const defaultFilters = {
    search: "",
    sales_channel: "",
    fulfillment_status: "",
  };

  const [filters, setFilters] = useState(defaultFilters);

  const { data, isLoading, refetch, isFetching } = useQueryOrders({
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
      return newFilters;
    });
    void storage.setItem("orders_filters", newFilters);
  }, []);

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
    filters,
    columns,
    handleFiltersChange,
    refetch,
    isFetching,
  };
};

export { useOrders, useOrdersWithData };
