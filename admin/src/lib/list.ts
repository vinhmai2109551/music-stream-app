/** A copy of `items` with the item at `index` moved by `delta` places (clamped to the ends). */
export function moveItem<T>(items: readonly T[], index: number, delta: number): T[] {
  const target = Math.min(items.length - 1, Math.max(0, index + delta))
  if (index < 0 || index >= items.length || target === index) return [...items]
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

/** A copy of `items` without the item at `index`. */
export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, position) => position !== index)
}
