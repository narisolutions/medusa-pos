import React from "react";
import { Ban, TriangleAlert } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
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
    <StatusChip
      intent={state === "out" || count === 1 ? "danger" : "warning"}
      icon={<Icon className="size-4" />}
      className="shadow-sm"
    >
      {label}
    </StatusChip>
  );
};

export default StockBadge;
