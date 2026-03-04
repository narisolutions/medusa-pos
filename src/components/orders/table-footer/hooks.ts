import { useState } from "react";

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface PaginationHandlers {
  handlePageChange: (newPageIndex: number) => void;
  handlePageSizeChange: (newPageSize: number) => void;
}

export interface PaginationHookReturn
  extends PaginationState,
    PaginationHandlers {
  totalPages: number;
  showingStart: number;
  showingEnd: number;
}

export interface UsePaginationProps {
  count: number;
  initialPageSize?: number;
  initialPageIndex?: number;
}

const usePagination = ({
  count,
  initialPageSize = 10,
  initialPageIndex = 0,
}: UsePaginationProps): PaginationHookReturn => {
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(count / pageSize);

  const handlePageChange = (newPageIndex: number) => {
    setPageIndex(newPageIndex);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  };

  const showingStart = count === 0 ? 0 : pageIndex * pageSize + 1;
  const showingEnd = Math.min((pageIndex + 1) * pageSize, count);

  return {
    pageIndex,
    pageSize,
    totalPages,
    showingStart,
    showingEnd,
    handlePageChange,
    handlePageSizeChange,
  };
};

export interface FooterProps {
  count: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  showingStart: number;
  showingEnd: number;
  isLoading: boolean;
  handlePageChange: (newPageIndex: number) => void;
  handlePageSizeChange: (newPageSize: number) => void;
}

export { usePagination };