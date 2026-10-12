import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type ListRowProps = Omit<React.ComponentProps<"button">, "title"> & {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** An icon or avatar before the text. */
  leading?: React.ReactNode
  /** Amounts, status chips or a secondary action after the text. */
  trailing?: React.ReactNode
  /** Shows a chevron: tapping opens a page or panel. */
  navigates?: boolean
}

/** A 56px+ row whose whole width is the tap target: orders, parked sales, printers, settings lists. */
function ListRow({ title, subtitle, leading, trailing, navigates, className, type = "button", ...props }: ListRowProps) {
  return (
    <button
      type={type}
      data-slot="list-row"
      className={cn(
        "flex min-h-tap-lg w-full items-center gap-4 rounded-md px-4 py-3 text-left transition-colors duration-100 cursor-pointer",
        "hover:bg-accent active:bg-accent disabled:pointer-events-none disabled:opacity-50",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      {leading && <span className="flex shrink-0 items-center text-fg-muted [&_svg:not([class*='size-'])]:size-6">{leading}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-medium text-fg">{title}</span>
        {subtitle && <span className="truncate text-base text-fg-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-3">{trailing}</span>}
      {navigates && <ChevronRight aria-hidden className="size-5 shrink-0 text-fg-subtle" />}
    </button>
  )
}

export { ListRow }
