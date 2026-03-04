import React from "react";

export type NumpadProps = {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  allowDecimal?: boolean;
  className?: string;
  hideActions?: boolean; // Hide Cancel and Done buttons
};


// 4x4 grid matching the screenshot
const NUMPAD_BUTTONS = [
  ["7", "8", "9", "Del"],
  ["4", "5", "6", "Clear"],
  ["1", "2", "3", "Cancel"],
  ["0", ".", "", "Done"],
];


export const Numpad: React.FC<NumpadProps> = ({
  value,
  onChange,
  onEnter,
  allowDecimal = true,
  className = "",
  hideActions = false,
}) => {
  const handleButtonClick = (btn: string) => {
    if (!btn) return;
    if (btn === "Del") {
      onChange(value.slice(0, -1));
    } else if (btn === "Clear") {
      onChange("");
    } else if (btn === "Cancel") {
      // Optionally, you can pass a prop for onCancel, for now just clear
      onChange("");
    } else if (btn === "Done") {
      onEnter?.();
    } else if (btn === ".") {
      if (allowDecimal && !value.includes(".")) {
        // If empty or just "0", replace with "0."
        // Otherwise append "."
        onChange(value && value !== "0" ? value + "." : "0.");
      }
    } else {
      // Number button clicked
      onChange(value === "0" ? btn : value + btn);
    }
  };

  return (
    <div
      className={`grid grid-cols-4 grid-rows-4 gap-3 w-full max-w-md mx-auto ${className}`}
      style={{ userSelect: "none" }}
    >
      {NUMPAD_BUTTONS.flat().map((btn, idx) => {
        // Hide Cancel and Done buttons if hideActions is true
        if (hideActions && (btn === "Cancel" || btn === "Done")) {
          return (
            <div key={idx} className="bg-transparent" />
          );
        }
        
        let btnClass =
          "aspect-square w-full rounded-lg flex items-center justify-center text-2xl transition min-h-[60px] ";
        if (btn === "Done") {
          btnClass += "font-bold bg-green-600 text-white hover:bg-green-700 active:bg-green-800";
        } else if (btn === "Cancel") {
          btnClass += "font-bold bg-red-500 text-white hover:bg-red-600 active:bg-red-700";
        } else if (btn === "Del" || btn === "Clear") {
          btnClass += "font-medium bg-gray-300 text-gray-800 hover:bg-gray-400 active:bg-gray-500";
        } else if (btn) {
          btnClass += "font-medium bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-900";
        } else {
          btnClass += "bg-transparent cursor-default";
        }
        const isDot = btn === ".";
        const isDisabled = (isDot && !allowDecimal) || !btn;
        return (
          <button
            key={idx}
            className={btnClass}
            onClick={() => handleButtonClick(btn)}
            disabled={isDisabled}
            tabIndex={btn ? 0 : -1}
          >
            {btn}
          </button>
        );
      })}
    </div>
  );
};

export default Numpad;
