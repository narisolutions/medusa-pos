import React, { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrdersWithData } from "./hooks";
import Header from "./table-header";
import Footer from "./table-footer";
import { useTranslation } from "@/i18n";

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    data: orders,
    isLoading,
    filters,
    debouncedFilters,
    columns,
    handleFiltersChange,
    refetch,
    isFetching,
  } = useOrdersWithData();

  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
      columnFilters,
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
  });

  // Sync the table from the debounced filters so the 500-row refilter only runs once
  // the user pauses. This effect is the single source of truth for table filter state —
  // the header updates `filters` via its callbacks and never mutates the table directly.
  useEffect(() => {
    setGlobalFilter(debouncedFilters.search || "");

    const newColumnFilters: ColumnFiltersState = [];

    if (debouncedFilters.fulfillment_status) {
      newColumnFilters.push({
        id: "fulfillment_status",
        value: debouncedFilters.fulfillment_status,
      });
    }

    if (debouncedFilters.sales_channel) {
      newColumnFilters.push({
        id: "sales_channel",
        value: debouncedFilters.sales_channel,
      });
    }

    if (debouncedFilters.payment_status) {
      newColumnFilters.push({
        id: "payment_status",
        value: debouncedFilters.payment_status,
      });
    }

    setColumnFilters((prev) => {
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify(newColumnFilters);
      if (prevStr !== newStr) {
        return newColumnFilters;
      }
      return prev;
    });

    setPagination((prev) => {
      if (prev.pageIndex === 0) {
        return prev;
      }
      return {
        ...prev,
        pageIndex: 0,
      };
    });
  }, [debouncedFilters]);

  const handleRowClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="bg-surface p-10 rounded-lg space-y-6 h-full flex flex-col">
      <Header
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      <div
        className={`${isLoading ? "opacity-60 pointer-events-none" : ""} transition-opacity duration-200 flex-1 min-h-0`}
      >
        <div className="bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm h-full flex flex-col">
          {/* Single dedicated scroll region: only the rows scroll (header stays sticky),
              so each scroll frame repaints just the rows instead of the whole card. */}
          <div className="flex-1 min-h-0 overflow-y-auto">
          <Table>
            <TableHeader className="bg-surface-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-theme-border hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-base font-semibold text-fg-muted py-4 px-4 first:pl-6 last:pr-6"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow
                      className="border-b border-theme-border hover:bg-surface-hover cursor-pointer"
                      onClick={() => handleRowClick(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="text-base text-fg py-5 px-4 first:pl-6 last:pr-6"
                          style={{
                            width: cell.column.getSize(),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </Fragment>
                ))
              ) : (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-base text-fg-muted h-96 align-middle"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-theme-border border-t-theme-border-strong rounded-full animate-spin"></div>
                        <span className="text-base">{t("orders.loading")}</span>
                      </div>
                    ) : (
                      <span className="text-base">{t("orders.empty_state")}</span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>
      <Footer
        count={table.getFilteredRowModel().rows.length}
        pageIndex={table.getState().pagination.pageIndex}
        pageSize={table.getState().pagination.pageSize}
        totalPages={Math.ceil(
          table.getFilteredRowModel().rows.length /
            table.getState().pagination.pageSize
        )}
        showingStart={
          table.getFilteredRowModel().rows.length === 0
            ? 0
            : table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
              1
        }
        showingEnd={Math.min(
          (table.getState().pagination.pageIndex + 1) *
            table.getState().pagination.pageSize,
          table.getFilteredRowModel().rows.length
        )}
        isLoading={isLoading}
        handlePageChange={(newPageIndex) => table.setPageIndex(newPageIndex)}
        handlePageSizeChange={(newPageSize) => table.setPageSize(newPageSize)}
      />
    </div>
  );
};

export default Orders;
