import React from "react";
import { Tile } from "@/components/ui/tile";
import { useTranslation } from "@/i18n";

interface Props {
  methods: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  label?: string;
}

/** Large payment-method buttons, one selected. */
const PaymentMethodPicker: React.FC<Props> = ({ methods, selected, onSelect, disabled, label }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-base font-medium text-fg mb-2">
        {label ?? t("orders.payment_method_label")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {methods.map((method) => (
          <Tile
            key={method.id}
            label={method.label}
            selected={selected === method.id}
            onClick={() => onSelect(method.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodPicker;
