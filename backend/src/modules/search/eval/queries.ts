import { readFile } from "node:fs/promises"

export const QUERY_KINDS = ["title", "artist", "mood", "occasion", "genre", "mixed"] as const
export type QueryKind = (typeof QUERY_KINDS)[number]

/** One question and the tracks that a person would accept as a good answer. */
export interface EvalQuery {
  id: string
  kind: QueryKind
  q: string
  relevant: string[]
  note?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Checks the content of `search-queries.json` and returns its queries; throws on the first mistake. */
export function parseEvalQueries(raw: unknown): EvalQuery[] {
  if (!isRecord(raw) || !Array.isArray(raw.queries)) {
    throw new Error('The file must be an object with a "queries" list')
  }
  const ids = new Set<string>()
  return raw.queries.map((entry: unknown, index) => {
    const where = `queries[${index}]`
    if (!isRecord(entry)) throw new Error(`${where} must be an object`)
    const { id, kind, q, relevant, note } = entry
    if (typeof id !== "string" || !id.trim()) throw new Error(`${where}.id must be a text`)
    if (ids.has(id)) throw new Error(`${where}: the id "${id}" is used twice`)
    ids.add(id)
    if (typeof kind !== "string" || !(QUERY_KINDS as readonly string[]).includes(kind)) {
      throw new Error(`${where} (${id}): kind must be one of ${QUERY_KINDS.join(", ")}`)
    }
    if (typeof q !== "string" || !q.trim()) throw new Error(`${where} (${id}): q must be a text`)
    if (!Array.isArray(relevant) || relevant.length === 0) {
      throw new Error(`${where} (${id}): relevant must list at least one track`)
    }
    if (relevant.some((track) => typeof track !== "string" || !track.trim())) {
      throw new Error(`${where} (${id}): relevant must hold track ids`)
    }
    if (new Set(relevant).size !== relevant.length) {
      throw new Error(`${where} (${id}): relevant lists a track twice`)
    }
    if (note !== undefined && typeof note !== "string") {
      throw new Error(`${where} (${id}): note must be a text`)
    }
    return {
      id,
      kind: kind as QueryKind,
      q: q.trim(),
      relevant: relevant as string[],
      ...(note === undefined ? {} : { note }),
    }
  })
}

export async function loadEvalQueries(path: string): Promise<EvalQuery[]> {
  return parseEvalQueries(JSON.parse(await readFile(path, "utf8")) as unknown)
}
