import React, { useRef } from "react";
import { Delete } from "lucide-react";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { applyNumpadKey, type NumpadKey } from "@/utils/ui/numpad";

export type NumpadProps = {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  allowDecimal?: boolean;
  /** Digits allowed after the point, e.g. 2 for money. */
  maxDecimals?: number;
  className?: string;
  /** Hide Done, for dialogs that confirm with their own button. */
  hideActions?: boolean;
};

const HOLD_TO_CLEAR_MS = 600;

const KEY =
  "flex h-20 w-full items-center justify-center rounded-lg text-2xl font-medium tabular-nums transition-all duration-100 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer";
const DIGIT = cn(KEY, "bg-fg text-surface active:bg-fg/80");
const EDIT = cn(KEY, "bg-surface-subtle text-fg active:bg-theme-border");

/** The shared keypad for amounts and quantities: 80px keys, hold backspace to clear. */
export const Numpad: React.FC<NumpadProps> = ({
  value,
  onChange,
  onEnter,
  allowDecimal = true,
  maxDecimals,
  className = "",
  hideActions = false,
}) => {
  const { t } = useTranslation();
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleared = useRef(false);

  const press = (key: NumpadKey) => onChange(applyNumpadKey(value, key, { allowDecimal, maxDecimals }));

  const startHold = () => {
    cleared.current = false;
    holdTimer.current = setTimeout(() => {
      cleared.current = true;
      onChange("");
    }, HOLD_TO_CLEAR_MS);
  };
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const digit = (key: NumpadKey, extra = "") => (
    <button type="button" className={cn(DIGIT, extra)} onClick={() => press(key)}>
      {key}
    </button>
  );

  return (
    <div className={cn("mx-auto grid w-full max-w-md grid-cols-4 gap-3 select-none", className)}>
      {digit("7")}
      {digit("8")}
      {digit("9")}
      <button
        type="button"
        className={EDIT}
        aria-label={t("ui.numpad_backspace")}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        // A hold already cleared the value; the click that follows must not delete again.
        onClick={() => {
          if (cleared.current) cleared.current = false;
          else press("backspace");
        }}
      >
        <Delete className="size-7" />
      </button>

      {digit("4")}
      {digit("5")}
      {digit("6")}
      <button type="button" className={cn(EDIT, "text-xl")} onClick={() => press("clear")}>
        {t("ui.numpad_clear")}
      </button>

      {digit("1")}
      {digit("2")}
      {digit("3")}
      {hideActions ? (
        <div className="row-span-2" />
      ) : (
        <button
          type="button"
          className={cn(KEY, "row-span-2 h-auto bg-success text-success-foreground text-xl font-bold active:bg-success/80")}
          onClick={() => onEnter?.()}
        >
          {t("ui.numpad_done")}
        </button>
      )}

      {digit("0", "col-span-2")}
      <button type="button" className={DIGIT} onClick={() => press(".")} disabled={!allowDecimal}>
        .
      </button>
    </div>
  );
};

export default Numpad;
