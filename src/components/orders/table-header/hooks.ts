import { AdminOrder } from "@medusajs/types";
import { Table } from "@tanstack/react-table";
import { useState } from "react";

const useHeader = ({ table }: { table: Table<AdminOrder> }) => {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const onStatusFilterClick = (status: string) => {
    setStatusFilter(status);
    if (status === "All") {
      table.getColumn("status")?.setFilterValue("");
    } else {
      table.getColumn("status")?.setFilterValue(status);
    }
  };

  const onGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    table.setGlobalFilter(value);
  };

  const onColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: value
    }));
    table.getColumn(columnId)?.setFilterValue(value || undefined);
  };

  const clearAllFilters = () => {
    setGlobalFilter("");
    setStatusFilter("All");
    setColumnFilters({});
    table.resetColumnFilters();
    table.resetGlobalFilter();
  };

  return {
    onStatusFilterClick,
    onGlobalFilterChange,
    onColumnFilterChange,
    clearAllFilters,
    globalFilter,
    statusFilter,
    columnFilters,
  };
};

export { useHeader };
