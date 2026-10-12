/** One step up or down, kept within [min, max]; `null` when the step can't move. */
export function stepValue(value: number, direction: 1 | -1, options: { min?: number; max?: number; step?: number } = {}): number | null {
  const { min = 0, max = Number.POSITIVE_INFINITY, step = 1 } = options;
  const next = Math.min(max, Math.max(min, value + direction * step));
  return next === value ? null : next;
}
