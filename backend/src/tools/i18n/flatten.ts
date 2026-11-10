/** What a locale file holds: texts, lists of texts and groups of both. */
export type Json = string | readonly Json[] | { readonly [key: string]: Json }

/** A tree of texts as one list: "auth.login.title" -> text; a list item is its index ("starters.0"). */
export type FlatTexts = Record<string, string>

export function flatten(tree: Json, prefix = ""): FlatTexts {
  if (typeof tree === "string") return { [prefix]: tree }
  const out: FlatTexts = {}
  const entries: [string, Json][] = Array.isArray(tree)
    ? tree.map((item, index): [string, Json] => [String(index), item])
    : Object.entries(tree)
  for (const [key, value] of entries) {
    Object.assign(out, flatten(value, prefix ? `${prefix}.${key}` : key))
  }
  return out
}

/**
 * The shape of `template` filled with `texts`. A text that is not there is left out, so the app falls
 * back to another language for it; a list is left out as a whole when one of its items is missing.
 */
export function fillTemplate(template: Json, texts: FlatTexts, prefix = ""): Json | undefined {
  if (typeof template === "string") return texts[prefix]
  if (Array.isArray(template)) {
    const items = template.map((item, index) =>
      fillTemplate(item, texts, prefix ? `${prefix}.${index}` : String(index)),
    )
    return items.every((item) => item !== undefined) ? (items as Json[]) : undefined
  }
  const out: Record<string, Json> = {}
  for (const [key, value] of Object.entries(template)) {
    const filled = fillTemplate(value, texts, prefix ? `${prefix}.${key}` : key)
    if (filled !== undefined) out[key] = filled
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Puts a text at a dotted path of a tree, making the groups on the way. */
export function setPath(tree: Record<string, Json>, path: string, text: string): void {
  const parts = path.split(".")
  let node = tree
  for (const part of parts.slice(0, -1)) {
    const next = node[part]
    if (typeof next === "object" && next !== null && !Array.isArray(next)) {
      node = next as Record<string, Json>
    } else {
      const created: Record<string, Json> = {}
      node[part] = created
      node = created
    }
  }
  node[parts[parts.length - 1]] = text
}
