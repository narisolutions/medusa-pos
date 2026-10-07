import React from "react";
import { PackageCheck, PackageX } from "lucide-react";
import ConditionStepper from "../condition-stepper";
import { useTranslation } from "@/i18n";
import type { useReturnSelection } from "./hooks";

type Selection = ReturnType<typeof useReturnSelection>;

interface Props {
  lines: Selection["lines"];
  selection: Selection["selection"];
  change: Selection["change"];
  disabled: boolean;
}

/** Each returnable line with a Back to stock and a Damaged count — no condition is assumed. */
const ReturnLines: React.FC<Props> = ({ lines, selection, change, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-theme-border divide-y divide-theme-border">
      {lines.map(({ item, returnable }) => {
        const s = selection[item.id] ?? { restock: 0, damaged: 0 };
        const full = s.restock + s.damaged >= returnable;
        return (
          <div key={item.id} className="p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-base font-medium text-fg">{item.title}</span>
              <span className="text-base text-fg-muted shrink-0">
                {t("orders.post_sale.return_returnable", { count: returnable, sold: item.quantity })}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <ConditionStepper
                label={t("orders.post_sale.return_restock")}
                icon={<PackageCheck className="size-5 text-green-600" />}
                value={s.restock}
                disabled={disabled}
                canIncrease={!full}
                onChange={(delta) => change(item.id, "restock", delta, returnable)}
              />
              <ConditionStepper
                label={t("orders.post_sale.return_damaged")}
                icon={<PackageX className="size-5 text-red-600" />}
                value={s.damaged}
                disabled={disabled}
                canIncrease={!full}
                onChange={(delta) => change(item.id, "damaged", delta, returnable)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReturnLines;
