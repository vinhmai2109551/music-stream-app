/** A YouTube video id is exactly 11 characters: letters, digits, "-" and "_" (same as the API). */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
])

/** Path prefixes whose next segment is the video id (`/embed/ID`, `/shorts/ID`, `/live/ID`, `/v/ID`). */
const ID_PREFIXES = new Set(["embed", "shorts", "live", "v"])

/**
 * The video id of whatever the person pasted: a bare id, a watch / short / embed link, or a
 * youtu.be link (extra parameters such as `&t=30s` or `?si=` are ignored). Null when there is none.
 */
export function parseYouTubeVideoId(input: string): string | null {
  const text = input.trim()
  if (VIDEO_ID.test(text)) return text

  const url = toUrl(text)
  if (!url) return null
  const host = url.hostname.toLowerCase()

  let candidate: string | null = null
  if (host === "youtu.be" || host === "www.youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null
  } else if (YOUTUBE_HOSTS.has(host)) {
    const [first, second] = url.pathname.split("/").filter(Boolean)
    candidate =
      first === "watch" ? url.searchParams.get("v") : ID_PREFIXES.has(first) ? second : null
  }
  return candidate !== null && VIDEO_ID.test(candidate) ? candidate : null
}

function toUrl(text: string): URL | null {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return null
  }
}

export const youtubeEmbedUrl = (videoId: string): string =>
  `https://www.youtube-nocookie.com/embed/${videoId}`

export const youtubeWatchUrl = (videoId: string): string =>
  `https://www.youtube.com/watch?v=${videoId}`
