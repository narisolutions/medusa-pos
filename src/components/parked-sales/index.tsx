import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminDraftOrder } from "@medusajs/types";
import { Bookmark } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
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
import { Button } from "@/components/ui/button";
import { useParkedSalesColumns, useParkedSalesWithData } from "./hooks";
import Header from "./table-header";
import Footer from "@/components/orders/table-footer";
import ResumeDialog from "./resume-dialog";
import DiscardDialog from "./discard-dialog";
import { useParkedSales } from "@/hooks/draft-order/useParkedSales";
import { useCartStore } from "@/context/cart";
import { useTranslation } from "@/i18n";

const ParkedSales: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    data: draftOrders,
    isLoading,
    isFetching,
    refetch,
    filters,
    debouncedFilters,
    handleFiltersChange,
  } = useParkedSalesWithData();

  const { parkCurrentSale, resumeParkedSale, discardParkedSale, canCreateDraftOrder } =
    useParkedSales();

  const items = useCartStore((state) => state.items);
  const draftOrderId = useCartStore((state) => state.draftOrderId);
  const releaseDraftOrder = useCartStore((state) => state.releaseDraftOrder);

  const [busyId, setBusyId] = useState<string | undefined>();
  const [pendingResume, setPendingResume] = useState<AdminDraftOrder | null>(null);
  const [pendingDiscard, setPendingDiscard] = useState<AdminDraftOrder | null>(null);

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const goToCheckout = useCallback(() => navigate("/checkout"), [navigate]);

  const resume = useCallback(
    async (targetId: string) => {
      setBusyId(targetId);
      try {
        await resumeParkedSale(targetId);
      } finally {
        setBusyId(undefined);
      }
    },
    [resumeParkedSale]
  );

  const handleResume = useCallback(
    (draftOrder: AdminDraftOrder) => {
      // A non-empty cart must be dealt with before its lines are replaced.
      if (items.length > 0) {
        setPendingResume(draftOrder);
        return;
      }
      void resume(draftOrder.id);
    },
    [items.length, resume]
  );

  const handleParkThenResume = useCallback(async () => {
    if (!pendingResume) return;
    const target = pendingResume;
    setBusyId(target.id);
    try {
      const parked = await parkCurrentSale();
      if (!parked) return;
      setPendingResume(null);
      await resumeParkedSale(target.id);
    } finally {
      setBusyId(undefined);
    }
  }, [pendingResume, parkCurrentSale, resumeParkedSale]);

  const handleDiscardThenResume = useCallback(async () => {
    if (!pendingResume) return;
    const target = pendingResume;
    releaseDraftOrder();
    setPendingResume(null);
    await resume(target.id);
  }, [pendingResume, releaseDraftOrder, resume]);

  const handleConfirmDiscard = useCallback(async () => {
    if (!pendingDiscard) return;
    setBusyId(pendingDiscard.id);
    try {
      await discardParkedSale(pendingDiscard.id);
      setPendingDiscard(null);
    } finally {
      setBusyId(undefined);
    }
  }, [pendingDiscard, discardParkedSale]);

  const { columns } = useParkedSalesColumns({
    onResume: handleResume,
    onDiscard: setPendingDiscard,
    onOpen: goToCheckout,
    busyId,
  });

  const table = useReactTable({
    data: draftOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
  });

  // Single source of truth for table filter state, driven off the debounced value.
  useEffect(() => {
    setGlobalFilter(debouncedFilters.search || "");
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [debouncedFilters]);

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

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
                {rows.length ? (
                  // Deliberately not clickable: resuming mutates the live cart, and an
                  // accidental tap on a touchscreen is not recoverable.
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-b border-theme-border hover:bg-surface-hover"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="text-base text-fg py-5 px-4 first:pl-6 last:pr-6"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell
                      colSpan={columns.length}
                      className="text-center h-96 align-middle"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-theme-border border-t-theme-border-strong rounded-full animate-spin" />
                          <span className="text-base text-fg-muted">
                            {t("parked.loading")}
                          </span>
                        </div>
                      ) : (
                        // Empty is the normal state, so it teaches rather than apologises.
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Bookmark className="size-10 text-fg-muted" />
                          <span className="text-base font-medium text-fg">
                            {t("parked.empty_title")}
                          </span>
                          <span className="text-base text-fg-muted">
                            {t("parked.empty_description")}
                          </span>
                          <Button className="mt-2" onClick={goToCheckout}>
                            {t("parked.empty_cta")}
                          </Button>
                        </div>
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
        count={filteredCount}
        pageIndex={table.getState().pagination.pageIndex}
        pageSize={table.getState().pagination.pageSize}
        totalPages={Math.ceil(filteredCount / table.getState().pagination.pageSize)}
        showingStart={
          filteredCount === 0
            ? 0
            : table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
              1
        }
        showingEnd={Math.min(
          (table.getState().pagination.pageIndex + 1) *
            table.getState().pagination.pageSize,
          filteredCount
        )}
        isLoading={isLoading}
        handlePageChange={(newPageIndex) => table.setPageIndex(newPageIndex)}
        handlePageSizeChange={(newPageSize) => table.setPageSize(newPageSize)}
      />

      <ResumeDialog
        open={!!pendingResume}
        isBound={!!draftOrderId}
        canPark={canCreateDraftOrder()}
        isBusy={!!busyId}
        onParkCurrent={() => void handleParkThenResume()}
        onDiscardCurrent={() => void handleDiscardThenResume()}
        onClose={() => setPendingResume(null)}
      />

      <DiscardDialog
        draftOrder={pendingDiscard}
        isDiscarding={!!busyId && busyId === pendingDiscard?.id}
        onConfirm={() => void handleConfirmDiscard()}
        onClose={() => setPendingDiscard(null)}
      />
    </div>
  );
};

export default ParkedSales;
