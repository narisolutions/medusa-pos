/**
 * One step up or down, kept within [min, max]; `null` when the step can't move. A value
 * already past a limit never steps further past it, so + can't lower an over-max value.
 */
export function stepValue(value: number, direction: 1 | -1, options: { min?: number; max?: number; step?: number } = {}): number | null {
  const { min = 0, max = Number.POSITIVE_INFINITY, step = 1 } = options;
  if (direction === 1 && value >= max) return null;
  if (direction === -1 && value <= min) return null;
  return Math.min(max, Math.max(min, value + direction * step));
}
