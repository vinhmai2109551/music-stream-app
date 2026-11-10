import { normalizeDraft } from "@/lib/lyrics-text"
import {
  applyTap,
  emptyMarks,
  marksFromTimings,
  nudge,
  toTimings,
  undoTap,
  type Marks,
} from "@/lib/tap-sync"

/** Lyrics as the API keeps them. */
export interface SavedLyrics {
  language: string
  lines: string[]
  timingsMs: number[] | null
}

export interface Draft {
  language: string
  lines: string[]
  /** Start of each line in ms, or null while the song is not (fully) synced. */
  timingsMs: number[] | null
  /** The taps of a sync in progress; once every line has one, they become `timingsMs`. */
  marks: Marks
}

export interface DraftState {
  draft: Draft
  /** What the API has now; null when the track has no lyrics yet. */
  saved: SavedLyrics | null
}

export type DraftAction =
  | { type: "loaded"; lyrics: SavedLyrics | null; defaultLanguage: string }
  | { type: "saved"; lyrics: SavedLyrics }
  | { type: "revert"; defaultLanguage: string }
  | { type: "setLanguage"; language: string }
  | { type: "applyText"; lines: string[] }
  | { type: "setLine"; index: number; text: string }
  | { type: "setTiming"; index: number; timeMs: number }
  | { type: "nudge"; index: number; deltaMs: number }
  | { type: "import"; lines: string[]; timingsMs: number[] | null }
  | { type: "tap"; timeMs: number }
  | { type: "undoTap" }
  | { type: "resetSync" }

function fromSaved(lyrics: SavedLyrics | null, defaultLanguage: string): Draft {
  if (!lyrics) return { language: defaultLanguage, lines: [], timingsMs: null, marks: [] }
  return {
    language: lyrics.language,
    lines: lyrics.lines,
    timingsMs: lyrics.timingsMs,
    marks: marksFromTimings(lyrics.lines, lyrics.timingsMs),
  }
}

export function initialDraftState(): DraftState {
  return { draft: fromSaved(null, "vi"), saved: null }
}

/** Timings were edited by hand or imported: the taps follow them. */
function withTimings(draft: Draft, timingsMs: number[] | null): Draft {
  return { ...draft, timingsMs, marks: marksFromTimings(draft.lines, timingsMs) }
}

/** Taps changed: the timings are those of the taps once every line has one, else none. */
function withMarks(draft: Draft, marks: Marks): Draft {
  return { ...draft, marks, timingsMs: toTimings(draft.lines, marks) }
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  const { draft } = state
  switch (action.type) {
    case "loaded":
      return { saved: action.lyrics, draft: fromSaved(action.lyrics, action.defaultLanguage) }
    case "saved":
      return { saved: action.lyrics, draft: fromSaved(action.lyrics, action.lyrics.language) }
    case "revert":
      return { ...state, draft: fromSaved(state.saved, action.defaultLanguage) }
    case "setLanguage":
      return { ...state, draft: { ...draft, language: action.language } }
    case "applyText": {
      // Timings belong to lines: when the number of lines changes they no longer fit.
      const keep = draft.timingsMs !== null && draft.timingsMs.length === action.lines.length
      return {
        ...state,
        draft: withTimings({ ...draft, lines: action.lines }, keep ? draft.timingsMs : null),
      }
    }
    case "setLine":
      return {
        ...state,
        draft: {
          ...draft,
          lines: draft.lines.map((line, index) => (index === action.index ? action.text : line)),
        },
      }
    case "setTiming": {
      if (draft.timingsMs === null) return state
      const next = draft.timingsMs.map((time, index) =>
        index === action.index ? Math.max(0, Math.round(action.timeMs)) : time,
      )
      return { ...state, draft: withTimings(draft, next) }
    }
    case "nudge":
      if (draft.timingsMs === null) return state
      return {
        ...state,
        draft: withTimings(draft, nudge(draft.timingsMs, action.index, action.deltaMs)),
      }
    case "import":
      return {
        ...state,
        draft: withTimings({ ...draft, lines: action.lines }, action.timingsMs),
      }
    case "tap": {
      const marks = applyTap(draft.lines, draft.marks, action.timeMs)
      return marks === null ? state : { ...state, draft: withMarks(draft, marks) }
    }
    case "undoTap":
      return { ...state, draft: withMarks(draft, undoTap(draft.lines, draft.marks)) }
    case "resetSync":
      return { ...state, draft: withMarks(draft, emptyMarks(draft.lines)) }
  }
}

/** What would be sent to the API: lines cut as the API cuts them, timings only when complete. */
export function draftToSave(draft: Draft): SavedLyrics {
  const { lines, timingsMs } = normalizeDraft({ lines: draft.lines, timingsMs: draft.timingsMs })
  return { language: draft.language, lines, timingsMs }
}

const sameList = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index])

/** True when the draft differs from what the API has. */
export function isDirty({ draft, saved }: DraftState): boolean {
  const current = draftToSave(draft)
  if (saved === null) return current.lines.some((line) => line.trim() !== "")
  return (
    current.language !== saved.language ||
    !sameList(current.lines, saved.lines) ||
    !sameList(current.timingsMs ?? [], saved.timingsMs ?? [])
  )
}
