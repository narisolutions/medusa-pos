import * as React from "react"
import { AlertTriangle, Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ChooserOption = {
  value: string
  label: React.ReactNode
  /** Text matched by the search box; defaults to the value. */
  searchText?: string
  hint?: React.ReactNode
  disabled?: boolean
  /** Why it can't be chosen, shown in place of the tick, e.g. "in use". */
  disabledReason?: React.ReactNode
}

type ChooserGroup = {
  id: string
  title?: React.ReactNode
  options: ChooserOption[]
  /** Folded under its title, which opens it, until tapped (or while it holds the current value). */
  collapsed?: boolean
}

type ChooserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  groups: ChooserGroup[]
  value?: string
  onSelect: (value: string) => void
  /** Shown above the options, e.g. a saved value the backend no longer has. */
  notice?: React.ReactNode
  /** "current" label next to the chosen option's tick. */
  currentLabel?: React.ReactNode
  /** Show a search box when there are more options than this. */
  searchThreshold?: number
}

const SEARCH_THRESHOLD = 12

/**
 * One choice out of many, for touch: full-width 56px rows instead of a narrow dropdown, groups,
 * the current one ticked, unavailable ones labelled with why. A search box appears for long lists.
 */
function ChooserDialog({
  open,
  onOpenChange,
  title,
  description,
  groups,
  value,
  onSelect,
  notice,
  currentLabel,
  searchThreshold = SEARCH_THRESHOLD,
}: ChooserDialogProps) {
  const { t } = useTranslation()
  const [query, setQuery] = React.useState("")
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  const total = groups.reduce((sum, group) => sum + group.options.length, 0)
  const searching = total > searchThreshold && query.trim() !== ""
  const needle = query.trim().toLowerCase()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setQuery("")
      // A folded group that holds the current value opens with it shown.
      setExpanded(new Set(groups.filter((g) => g.options.some((o) => o.value === value)).map((g) => g.id)))
    }
    onOpenChange(next)
  }

  const row = (option: ChooserOption) => {
    const current = option.value === value
    return (
      <Button
        key={option.value}
        type="button"
        variant={current ? "default" : "outline"}
        aria-pressed={current}
        disabled={option.disabled}
        className="h-auto min-h-tap-lg w-full justify-between gap-3 whitespace-normal py-3 text-left"
        onClick={() => {
          onSelect(option.value)
          onOpenChange(false)
        }}
      >
        <span className="flex min-w-0 flex-col">
          <span className="break-words">{option.label}</span>
          {option.hint && <span className={cn("text-base font-normal", current ? "opacity-85" : "text-fg-muted")}>{option.hint}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {current && (
            <>
              <Check className="size-5" />
              {currentLabel}
            </>
          )}
          {!current && option.disabled && option.disabledReason}
        </span>
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {notice}
          {total > searchThreshold && (
            <Input clearable value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ui.search")} aria-label={t("ui.search")} />
          )}
          {groups.map((group) => {
            const options = searching
              ? group.options.filter((o) => (o.searchText ?? o.value).toLowerCase().includes(needle))
              : group.options
            if (options.length === 0) return null
            const folded = group.collapsed && !searching && !expanded.has(group.id)
            return (
              <div key={group.id} className="flex flex-col gap-3">
                {group.collapsed && !searching ? (
                  // A folded group's title is its own toggle: it says what is folded and how many.
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-between px-2 text-base font-semibold"
                    aria-expanded={!folded}
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev)
                        if (next.has(group.id)) next.delete(group.id)
                        else next.add(group.id)
                        return next
                      })
                    }
                  >
                    <span className="whitespace-normal text-left">
                      {group.title} ({options.length})
                    </span>
                    <ChevronDown className={cn("size-5 shrink-0 transition-transform", !folded && "rotate-180")} />
                  </Button>
                ) : (
                  group.title && <p className="text-base font-semibold">{group.title}</p>
                )}
                {!folded && options.map(row)}
              </div>
            )
          })}
        </div>
        <DialogFooter sticky>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The field that opens a ChooserDialog: shows the choice (or a placeholder) and a warning flag. */
function ChooserTrigger({
  value,
  placeholder,
  warning,
  mono,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & { value?: React.ReactNode; placeholder: React.ReactNode; warning?: boolean; mono?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-tap w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-left text-base shadow-xs active:bg-accent cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-50",
        warning ? "border-warning" : "border-input",
        mono && "font-mono",
        className
      )}
      {...props}
    >
      <span className={cn("min-w-0 flex-1 truncate", !value && "font-sans text-fg-subtle")}>{value || placeholder}</span>
      {warning && <AlertTriangle aria-hidden className="size-4 shrink-0 text-warning-text" />}
      <ChevronDown aria-hidden className="size-4 shrink-0 opacity-50" />
    </button>
  )
}

export { ChooserDialog, ChooserTrigger }
export type { ChooserGroup, ChooserOption }
