import React from "react";
import { StatusChip } from "@/components/ui/status-chip";
import { useTranslation } from "@/i18n";
import { humanizeStatus, orderStatusIntent, type StatusKind } from "@/utils/orders/status";

interface Props {
  kind: StatusKind;
  status: string;
  className?: string;
}

/** An order, payment or fulfilment status as icon + word + colour, the same in the list and on the order. */
const OrderStatusChip: React.FC<Props> = ({ kind, status, className }) => {
  const { t } = useTranslation();
  return (
    <StatusChip intent={orderStatusIntent(kind, status)} className={className}>
      {t(`orders.status_${status}`, { defaultValue: humanizeStatus(status) })}
    </StatusChip>
  );
};

export default OrderStatusChip;
