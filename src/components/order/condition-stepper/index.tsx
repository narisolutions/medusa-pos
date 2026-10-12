import React from "react";
import { Stepper } from "@/components/ui/stepper";

interface Props {
  label: string;
  icon: React.ReactNode;
  value: number;
  disabled: boolean;
  /** What's left of the line for this condition, so + stops where the line does. */
  max: number;
  onChange: (delta: number) => void;
}

/** A labelled −/+ counter with touch-sized buttons. */
const ConditionStepper: React.FC<Props> = ({ label, icon, value, disabled, max, onChange }) => (
  <div className="flex items-center gap-3">
    <span className="flex items-center gap-2 w-40 text-base text-fg">
      {icon}
      {label}
    </span>
    <Stepper value={value} min={0} max={max} disabled={disabled} onChange={(next) => onChange(next - value)} />
  </div>
);

export default ConditionStepper;
