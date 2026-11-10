import type { JsonObject } from "../../../shared/llm/llm-client.js"

/** What a tool says to the model: plain JSON, short, and never a URL or a secret. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/** Who asks. A tool never takes the user from its arguments: only from here. */
export interface ToolContext {
  userId: string
}

/**
 * The things a result is about, as ids: the app shows them as cards (a track row, an artist...).
 * They are kept with the result so that an old conversation shows the same cards when reopened.
 */
export interface DisplayRefs {
  tracks?: string[]
  artists?: string[]
  albums?: string[]
  playlists?: string[]
  /** Where a help answer came from, for the citation. */
  sources?: { source: string; heading: string }[]
}

/** Something only the app can do, sent to it as an event. */
export interface ClientAction {
  action: "play_tracks"
  trackIds: string[]
}

export interface ToolResult {
  /** What the model reads. */
  result: JsonValue
  display?: DisplayRefs
  clientAction?: ClientAction
}

/** What the person is asked to approve before a tool that changes their data runs. */
export interface Proposal {
  /** The arguments as they will be used: checked and tidied. */
  input: JsonObject
  /** One sentence that says exactly what will happen. */
  summary: string
}

interface ToolBase {
  name: string
  /** For the model: when to use it and what it returns. */
  description: string
  /** JSON schema of the arguments. */
  parameters: JsonObject
}

/** Runs at once: reads data, or asks the app to do something harmless (play). */
export interface ImmediateTool extends ToolBase {
  kind: "read" | "client"
  run(context: ToolContext, args: JsonObject): Promise<ToolResult>
}

/** Changes the data of the person: only proposed by the model; `execute` runs after they agree. */
export interface WriteTool extends ToolBase {
  kind: "write"
  propose(context: ToolContext, args: JsonObject): Promise<Proposal>
  execute(context: ToolContext, input: JsonObject): Promise<ToolResult>
}

export type AssistantTool = ImmediateTool | WriteTool

/**
 * A tool refuses its arguments, or the thing asked for is not there or not the user's. The message
 * goes back to the model, which can fix the call or tell the person; keep it short and factual.
 */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ToolInputError"
  }
}

// ----------------------------------------------------------------------- arguments

interface TextRules {
  min?: number
  max: number
  optional?: boolean
}

/** A text argument: trimmed, within its length. */
export function textArg(args: JsonObject, name: string, rules: TextRules): string | undefined {
  const value = args[name]
  if (value === undefined || value === null) {
    if (rules.optional) return undefined
    throw new ToolInputError(`"${name}" is required`)
  }
  if (typeof value !== "string") throw new ToolInputError(`"${name}" must be a text`)
  const text = value.trim()
  if (text.length < (rules.min ?? 1)) {
    if (rules.optional && text === "") return undefined
    throw new ToolInputError(`"${name}" must not be empty`)
  }
  if (text.length > rules.max) {
    throw new ToolInputError(`"${name}" must be at most ${rules.max} characters`)
  }
  return text
}

/** A whole number argument within `min` and `max`, or `fallback` when it is missing. */
export function intArg(
  args: JsonObject,
  name: string,
  rules: { min: number; max: number; fallback: number },
): number {
  const value = args[name]
  if (value === undefined || value === null) return rules.fallback
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ToolInputError(`"${name}" must be a whole number`)
  }
  if (value < rules.min || value > rules.max) {
    throw new ToolInputError(`"${name}" must be between ${rules.min} and ${rules.max}`)
  }
  return value
}

/** One of `allowed`, or `fallback` (undefined: none) when it is missing. */
export function enumArg<T extends string>(
  args: JsonObject,
  name: string,
  allowed: readonly T[],
  fallback?: T,
): T | undefined {
  const value = args[name]
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new ToolInputError(`"${name}" must be one of: ${allowed.join(", ")}`)
  }
  return value as T
}

/** A list of ids: texts, no duplicates (kept in order), `min` to `max` of them. */
export function idsArg(
  args: JsonObject,
  name: string,
  rules: { min: number; max: number },
): string[] {
  const value = args[name]
  if (value === undefined || value === null) {
    if (rules.min === 0) return []
    throw new ToolInputError(`"${name}" is required`)
  }
  if (!Array.isArray(value)) throw new ToolInputError(`"${name}" must be a list of ids`)
  if (value.some((id) => typeof id !== "string" || !id.trim() || id.length > 100)) {
    throw new ToolInputError(`"${name}" must hold ids as texts`)
  }
  const ids = [...new Set((value as string[]).map((id) => id.trim()))]
  if (ids.length < rules.min) {
    throw new ToolInputError(`"${name}" needs at least ${rules.min} id(s)`)
  }
  if (ids.length > rules.max) {
    throw new ToolInputError(`"${name}" can hold at most ${rules.max} ids`)
  }
  return ids
}
