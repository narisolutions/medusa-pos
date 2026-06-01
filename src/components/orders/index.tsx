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

  useEffect(() => {
    setGlobalFilter(filters.search || "");

    const newColumnFilters: ColumnFiltersState = [];

    if (filters.fulfillment_status) {
      newColumnFilters.push({
        id: "fulfillment_status",
        value: filters.fulfillment_status,
      });
    }

    if (filters.sales_channel) {
      newColumnFilters.push({
        id: "sales_channel",
        value: filters.sales_channel,
      });
    }

    if (filters.payment_status) {
      newColumnFilters.push({
        id: "payment_status",
        value: filters.payment_status,
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
  }, [filters]);

  const handleRowClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="bg-surface p-10 rounded-lg space-y-6 h-full flex flex-col">
      <Header
        filters={filters}
        onFiltersChange={handleFiltersChange}
        table={table}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      <div
        className={`${isLoading ? "opacity-60 pointer-events-none" : ""} transition-opacity duration-200 flex-1 min-h-0`}
      >
        <div className="bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm h-full flex flex-col">
          <Table className="h-full">
            <TableHeader className="bg-surface-muted shrink-0">
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
            <TableBody className="flex-1 overflow-auto">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow
                      className="border-b border-theme-border hover:bg-surface-hover transition-colors duration-150 cursor-pointer"
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
