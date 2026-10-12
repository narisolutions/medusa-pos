import * as React from "react"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

type Intent = "success" | "warning" | "danger" | "info" | "neutral"

const INTENT_CLASSES: Record<Intent, string> = {
  success: "bg-success-subtle text-success-text",
  warning: "bg-warning-subtle text-warning-text",
  danger: "bg-danger-subtle text-danger-text",
  info: "bg-info-subtle text-info-text",
  neutral: "bg-surface-subtle text-fg-muted",
}

const INTENT_ICONS: Record<Intent, React.ComponentType<{ className?: string }> | null> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  neutral: null,
}

/**
 * A state shown as icon + word + colour, never colour alone: Paid, Unpaid, In stock,
 * Offline. `icon` replaces the intent's icon; `null` drops it.
 */
function StatusChip({
  intent = "neutral",
  icon,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { intent?: Intent; icon?: React.ReactNode | null }) {
  const DefaultIcon = INTENT_ICONS[intent]
  const shownIcon = icon === undefined ? DefaultIcon && <DefaultIcon className="size-4" /> : icon

  return (
    <span
      data-slot="status-chip"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-medium whitespace-nowrap [&_svg]:shrink-0",
        INTENT_CLASSES[intent],
        className
      )}
      {...props}
    >
      {shownIcon && <span aria-hidden className="inline-flex">{shownIcon}</span>}
      {children}
    </span>
  )
}

export { StatusChip }
export type { Intent as StatusIntent }
