import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { FitText } from "@/components/ui/fit-text"

type TileProps = Omit<React.ComponentProps<"button">, "children"> & {
  icon?: React.ReactNode
  /** An action ("Add discount") or a choice ("Cash"). */
  label: React.ReactNode
  /** Live state under the label: "−10 %", the customer's name, a total. */
  subline?: React.ReactNode
  /** Actionable count or flag in the corner. */
  badge?: React.ReactNode
  /** A chosen option: fill + ✓, never colour alone. */
  selected?: boolean
  size?: "md" | "lg"
}

/** A large tap target for actions and choices: payment methods, cart actions, post-sale paths. */
function Tile({ icon, label, subline, badge, selected, size = "md", className, type = "button", ...props }: TileProps) {
  return (
    <button
      type={type}
      data-slot="tile"
      aria-pressed={selected}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-1 rounded-lg border px-3 py-3 text-center transition-all duration-100",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "[&_svg:not([class*='size-'])]:size-6",
        size === "lg" ? "min-h-24" : "min-h-tap-xl",
        selected
          ? "border-primary bg-primary text-primary-foreground active:bg-primary/80"
          : "border-theme-border bg-surface text-fg hover:bg-accent active:bg-accent",
        className
      )}
      {...props}
    >
      {icon && <span aria-hidden className="inline-flex">{icon}</span>}
      <FitText className="w-full text-base font-semibold leading-tight">{label}</FitText>
      {subline && (
        <span className={cn("text-base leading-tight", selected ? "text-primary-foreground/85" : "text-fg-muted")}>
          {subline}
        </span>
      )}
      {selected && <Check aria-hidden className="absolute top-2 right-2 size-5" />}
      {badge && !selected && <span className="absolute -top-2 -right-2">{badge}</span>}
    </button>
  )
}

export { Tile }
