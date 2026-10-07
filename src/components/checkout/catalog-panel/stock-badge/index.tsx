import React from "react";
import { Ban, TriangleAlert } from "lucide-react";
import { useTranslation } from "@/i18n";

interface Props {
  state: "out" | "low";
  /** A variant's exact count; a product's "low" has none. */
  count?: number;
}

const StockBadge: React.FC<Props> = ({ state, count }) => {
  const { t } = useTranslation();

  const label =
    state === "out"
      ? t("checkout.out_of_stock")
      : count === 1
        ? t("checkout.last_one")
        : typeof count === "number"
          ? t("checkout.only_n_left", { count })
          : t("checkout.catalog_low_stock");

  const Icon = state === "out" ? Ban : TriangleAlert;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-medium shadow-sm ${
        state === "out" || count === 1
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
};

export default StockBadge;
