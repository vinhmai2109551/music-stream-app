/** Adds the id when missing, removes it when present. Returns a new array. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}
