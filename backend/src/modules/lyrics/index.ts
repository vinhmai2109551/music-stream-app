/** Public API of the lyrics module. Other modules must import from here only. */
export { LyricsModule } from "./lyrics.module.js"
export { lyricsThrottler } from "./lyrics.config.js"
export { lyricsContentHash, normalizeLines } from "./lyrics-text.js"
export { LYRICS_SOURCE } from "./ports.js"
export type { LyricsLookup, LyricsSource, SourcedLyrics } from "./ports.js"
