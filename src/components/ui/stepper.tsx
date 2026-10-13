import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"
import { stepValue } from "@/utils/ui/stepper"

type StepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Tapping the number, e.g. to type it on the Numpad. */
  onValueClick?: () => void
  disabled?: boolean
  className?: string
}

const REPEAT_AFTER_MS = 400
const REPEAT_EVERY_MS = 120

const SIDE =
  "flex size-tap-lg shrink-0 items-center justify-center rounded-lg border-2 shadow-sm transition-all duration-100 active:scale-[0.96] disabled:opacity-35 disabled:shadow-none disabled:pointer-events-none cursor-pointer [&_svg]:size-6 [&_svg]:stroke-[2.75]"
// Filled and outlined so they read as buttons at a glance; + (the one used most) in the brand colour.
const DECREASE = cn(SIDE, "border-theme-border-strong bg-surface-subtle text-fg active:bg-theme-border")
const INCREASE = cn(SIDE, "border-primary bg-primary/10 text-primary active:bg-primary/20")

/** − value + with 56px buttons; holding a button repeats the step. */
function Stepper({ value, onChange, min = 0, max, step = 1, onValueClick, disabled, className }: StepperProps) {
  const { t } = useTranslation()
  // A held button's timer outlives renders: it steps from the latest value and calls the
  // latest onChange, or a caller computing a delta from its own props would count twice.
  const latest = React.useRef(value)
  const latestProps = React.useRef({ onChange, min, max, step })
  React.useEffect(() => {
    latest.current = value
    latestProps.current = { onChange, min, max, step }
  })
  const timers = React.useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({})
  const repeated = React.useRef(false)

  const move = (direction: 1 | -1) => {
    const { onChange, ...limits } = latestProps.current
    const next = stepValue(latest.current, direction, limits)
    if (next === null) return false
    latest.current = next
    onChange(next)
    return true
  }

  const stop = () => {
    clearTimeout(timers.current.delay)
    clearInterval(timers.current.repeat)
    timers.current = {}
  }
  React.useEffect(() => stop, [])

  const startHold = (direction: 1 | -1) => {
    repeated.current = false
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => {
        repeated.current = true
        if (!move(direction)) stop()
      }, REPEAT_EVERY_MS)
    }, REPEAT_AFTER_MS)
  }

  // A hold already stepped; the click that ends it must not add one more.
  const tap = (direction: 1 | -1) => {
    if (!repeated.current) move(direction)
    repeated.current = false
  }

  const atMin = stepValue(value, -1, { min, max, step }) === null
  const atMax = stepValue(value, 1, { min, max, step }) === null

  return (
    <div data-slot="stepper" className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        className={DECREASE}
        aria-label={t("ui.stepper_decrease")}
        disabled={disabled || atMin}
        onPointerDown={() => startHold(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={() => tap(-1)}
      >
        <Minus />
      </button>
      {onValueClick ? (
        <button
          type="button"
          onClick={onValueClick}
          disabled={disabled}
          className="min-w-14 h-tap-lg rounded-lg px-2 text-xl font-semibold tabular-nums active:bg-accent cursor-pointer"
        >
          {value}
        </button>
      ) : (
        <span className="min-w-14 text-center text-xl font-semibold tabular-nums">{value}</span>
      )}
      <button
        type="button"
        className={INCREASE}
        aria-label={t("ui.stepper_increase")}
        disabled={disabled || atMax}
        onPointerDown={() => startHold(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={() => tap(1)}
      >
        <Plus />
      </button>
    </div>
  )
}

export { Stepper }
