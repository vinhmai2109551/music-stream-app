/**
 * What an optional section (recommendations, similar tracks) shows. These sections are extras:
 * when they cannot be loaded (the AI features are off, the network failed) or have nothing to
 * show, they are not shown at all, with no error message.
 */
export type OptionalSection<T> =
  { status: "loading" } | { status: "hidden" } | { status: "ready"; items: T[] }

type Loaded<T> =
  { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: T }

/** Turns a loaded resource into what the section shows; `pick` returns its items. */
export function toOptionalSection<T, Item>(
  state: Loaded<T>,
  pick: (data: T) => Item[],
): OptionalSection<Item> {
  if (state.status === "loading") return { status: "loading" }
  if (state.status === "error") return { status: "hidden" }
  const items = pick(state.data)
  return items.length === 0 ? { status: "hidden" } : { status: "ready", items }
}
