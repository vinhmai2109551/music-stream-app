type Row = Record<string, unknown>

function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => same(item, b[index]))
  }
  // An empty field and a missing one mean the same thing to the person editing.
  const blank = (value: unknown) => value === undefined || value === null || value === ""
  if (blank(a) && blank(b)) return true
  return a === b
}

/**
 * The fields of `values` that differ from `original`. Editing sends only these (a PATCH): the API
 * checks every media URL it receives, so sending back an unchanged cover that does not live in our
 * storage (demo data) would be refused although the person never touched it.
 */
export function pickChanged(original: Row | undefined, values: Row): Row {
  const out: Row = {}
  for (const [key, value] of Object.entries(values)) {
    if (!same(original?.[key], value)) out[key] = value
  }
  return out
}
