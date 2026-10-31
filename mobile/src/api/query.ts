type QueryValue = string | number | undefined

/** Builds `?a=1&b=2`, skipping undefined and empty values. Returns "" when nothing is left. */
export function toQuery(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Record<string, QueryValue>)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}

/** Makes an id safe to put in a URL path. */
export const pathId = (id: string): string => encodeURIComponent(id)
