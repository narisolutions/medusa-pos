import React from "react";

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

const toHexColor = (value: string | undefined, fallback: string) => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
};

interface Props {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const ColorField: React.FC<Props> = ({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}) => {
  const pickerValue = toHexColor(value, "#2563eb");

  return (
    <FormItem>
      <FormLabel className="text-lg font-medium">{label}</FormLabel>
      <FormControl>
        <div className="flex items-center gap-3">
          <label
            className={`h-12 w-14 rounded-xl border border-theme-border p-1 ${
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            aria-label={`Select ${label.toLowerCase()}`}
          >
            <input
              type="color"
              value={pickerValue}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="h-full w-full rounded-lg border-0 bg-transparent p-0"
            />
          </label>
          <Input
            type="text"
            placeholder={placeholder}
            className="h-12 text-lg px-4"
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </FormControl>
    </FormItem>
  );
};

export default ColorField;
