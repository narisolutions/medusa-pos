import React from "react";
import { Button } from "@/components/ui/button";
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
          <Button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            disabled={disabled}
            aria-pressed={selected === method.id}
            className={`h-16 text-base font-semibold ${
              selected === method.id
                ? "bg-primary text-white shadow"
                : "bg-surface border border-theme-border hover:bg-surface-hover text-fg"
            }`}
          >
            {method.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodPicker;
