import * as React from "react"
import { Loader2, WifiOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import { Button } from "@/components/ui/button"

type PanelProps = {
  icon?: React.ReactNode
  title: React.ReactNode
  hint?: React.ReactNode
  /** The one next step, e.g. a Button. */
  action?: React.ReactNode
  className?: string
}

function Panel({ icon, title, hint, action, className, role }: PanelProps & { role?: string }) {
  return (
    <div role={role} className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {icon && <span aria-hidden className="text-fg-subtle [&_svg:not([class*='size-'])]:size-10">{icon}</span>}
      <p className="text-lg font-semibold text-fg">{title}</p>
      {hint && <p className="max-w-prose text-base text-fg-muted">{hint}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}

/** Nothing here yet, and what to do about it. */
function EmptyState(props: PanelProps) {
  return <Panel {...props} />
}

/**
 * Something failed to load. Offers Retry when given `onRetry`; the default icon assumes the
 * usual cause at a till, the connection.
 */
function ErrorState({ onRetry, icon, ...props }: PanelProps & { onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <Panel
      {...props}
      role="alert"
      icon={icon ?? <WifiOff />}
      action={
        props.action ??
        (onRetry && (
          <Button size="lg" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        ))
      }
    />
  )
}

/** Loading, with words: a spinner alone reads as "stuck" at arm's length. */
function LoadingState({ label, className }: { label: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-3 px-6 py-12 text-base text-fg-muted", className)}>
      <Loader2 aria-hidden className="size-6 animate-spin" />
      {label}
    </div>
  )
}

export { EmptyState, ErrorState, LoadingState }
