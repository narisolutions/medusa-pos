import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import React from "react";
import { FooterProps } from "./hooks";
import { useTranslation } from "@/i18n";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Footer: React.FC<FooterProps> = ({
  count,
  pageIndex,
  pageSize,
  totalPages,
  showingStart,
  showingEnd,
  isLoading,
  handlePageChange,
  handlePageSizeChange,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handlePageChange(0)}
          disabled={pageIndex === 0 || isLoading || totalPages === 0}
          aria-label={t("pagination.first_page")}
          className="size-tap-lg p-0"
        >
          <ChevronsLeft className="size-6" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => handlePageChange(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0 || isLoading || totalPages === 0}
          aria-label={t("pagination.previous_page")}
          className="size-tap-lg p-0"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <span className="flex items-center text-base font-medium text-fg px-4">
          {t("pagination.page_label")}{" "}
          <strong className="mx-1 inline-block min-w-[2ch] text-center">
            {totalPages > 0 ? pageIndex + 1 : 0}
          </strong>{" "}
          {t("pagination.of")}{" "}
          <strong className="inline-block min-w-[3ch] text-center">
            {totalPages}
          </strong>
        </span>
        <Button
          variant="outline"
          size="lg"
          onClick={() =>
            handlePageChange(Math.min(totalPages - 1, pageIndex + 1))
          }
          disabled={
            pageIndex >= totalPages - 1 || isLoading || totalPages === 0
          }
          aria-label={t("pagination.next_page")}
          className="size-tap-lg p-0"
        >
          <ChevronRight className="size-6" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => handlePageChange(totalPages - 1)}
          disabled={
            pageIndex >= totalPages - 1 || isLoading || totalPages === 0
          }
          aria-label={t("pagination.last_page")}
          className="size-tap-lg p-0"
        >
          <ChevronsRight className="size-6" />
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <label htmlFor="page-size" className="text-base text-fg-muted">
          {t("pagination.rows_per_page")}
        </label>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => handlePageSizeChange(Number(value))}
        >
          <SelectTrigger
            id="page-size"
            className="min-w-20 text-base"
            disabled={isLoading}
          >
            <SelectValue />
          </SelectTrigger>
          {/* Footer sits at the viewport bottom — open upward so options stay on screen */}
          <SelectContent side="top">
            {[10, 20, 30, 40, 50].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-base text-fg-muted ml-2 min-w-20 flex items-center justify-center tabular-nums">
          {count === 0 ? (
            <LoadingSpinner />
          ) : (
            <>
              {showingStart}-{showingEnd} {t("pagination.of")} {count}
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export default Footer;
