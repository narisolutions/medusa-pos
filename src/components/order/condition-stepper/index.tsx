import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

interface Props {
  label: string;
  icon: React.ReactNode;
  value: number;
  disabled: boolean;
  onChange: (delta: number) => void;
}

/** A labelled −/+ counter with touch-sized buttons. */
const ConditionStepper: React.FC<Props> = ({ label, icon, value, disabled, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 w-40 text-base text-fg">
        {icon}
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || value === 0}
        onClick={() => onChange(-1)}
        aria-label={`${t("orders.post_sale.decrease")}: ${label}`}
      >
        <Minus className="size-5" />
      </Button>
      <span className="w-10 text-center text-lg font-semibold">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => onChange(1)}
        aria-label={`${t("orders.post_sale.increase")}: ${label}`}
      >
        <Plus className="size-5" />
      </Button>
    </div>
  );
};

export default ConditionStepper;
