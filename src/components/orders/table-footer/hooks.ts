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
