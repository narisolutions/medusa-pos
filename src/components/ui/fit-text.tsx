import * as React from "react"
import { useLayoutEffect, useRef } from "react"

import { cn } from "@/lib/utils"

type FitTextProps = React.ComponentProps<"span"> & {
  /** The smallest font size, in px, it may shrink to. */
  minSize?: number
}

/**
 * Text for a fixed-size box (a nav label, a keypad key). It wraps between words; only when a single
 * word is wider than the box (Georgian runs long) does it shrink the font, rather than break the word.
 */
function FitText({ minSize = 12, className, children, ...props }: FitTextProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    let width = -1
    const fit = () => {
      if (box.clientWidth === width) return
      width = box.clientWidth
      el.style.fontSize = ""
      el.style.overflowWrap = ""
      let size = parseFloat(getComputedStyle(el).fontSize)
      while (el.scrollWidth > el.clientWidth && size > minSize) {
        size -= 1
        el.style.fontSize = `${size}px`
      }
      // Still too wide at the smallest size: break the word rather than spill out of the box.
      if (el.scrollWidth > el.clientWidth) el.style.overflowWrap = "anywhere"
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [children, minSize])

  return (
    <span ref={ref} data-slot="fit-text" className={cn("block min-w-0 max-w-full", className)} {...props}>
      {children}
    </span>
  )
}

export { FitText }
