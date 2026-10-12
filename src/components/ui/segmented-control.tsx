import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: React.ReactNode; icon?: React.ReactNode; disabled?: boolean }

type SegmentedControlProps<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Names the group for screen readers, e.g. "Theme". */
  label: string
  size?: "md" | "lg"
  className?: string
}

/**
 * One choice out of 2–5, all visible: Light / Dark / System, Cards / List. The chosen one
 * is filled, bold and ticked, never shown by colour alone. Use a ChooserDialog for more.
 */
function SegmentedControl<T extends string>({ options, value, onChange, label, size = "md", className }: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="segmented-control"
      className={cn("inline-flex gap-1 rounded-lg bg-muted p-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 text-base transition-all duration-100 active:scale-[0.98] cursor-pointer",
              "disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-5",
              size === "lg" ? "min-h-tap-lg" : "min-h-tap",
              selected
                ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                : "font-medium text-fg-muted active:bg-accent"
            )}
          >
            {selected ? <Check aria-hidden className="size-5" /> : option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
