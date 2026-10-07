import React from "react";
import { formatPrice } from "@/utils/helpers";
import { differenceDirection } from "@/utils/pos/post-sale";
import { useTranslation } from "@/i18n";

interface Props {
  currency: string;
  goingOut: number;
  comingBack?: number;
  /** Nothing is settled now; the amount joins what the customer already owes. */
  settleLater?: boolean;
}

/** The running difference pinned under a post-sale dialog; a local estimate until confirm. */
const PostSaleDifference: React.FC<Props> = ({ currency, goingOut, comingBack = 0, settleLater }) => {
  const { t } = useTranslation();
  const difference = goingOut - comingBack;
  const direction = differenceDirection(difference);
  const amount = formatPrice(Math.abs(difference), currency);

  return (
    <div className="rounded-lg border border-theme-border bg-surface-muted p-4 space-y-1">
      <div className="flex justify-between gap-4 text-base text-fg-muted">
        {comingBack > 0 && (
          <span>
            {t("orders.post_sale.coming_back")} −{formatPrice(comingBack, currency)}
          </span>
        )}
        <span className="ml-auto">
          {t("orders.post_sale.going_out")} +{formatPrice(goingOut, currency)}
        </span>
      </div>
      <div className="text-2xl font-bold text-fg text-right">
        {settleLater
          ? t("orders.post_sale.direction_owed", { amount })
          : direction === "even"
            ? t("orders.post_sale.direction_even")
            : t(`orders.post_sale.direction_${direction}`, { amount })}
      </div>
    </div>
  );
};

export default PostSaleDifference;
