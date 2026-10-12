const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Whether two form value trees are the same for "unsaved changes". A key holding
 * `undefined` counts as absent: a field mounted with no saved value is not an edit.
 */
function sameFormValues(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameFormValues(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!sameFormValues(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

export { sameFormValues };
