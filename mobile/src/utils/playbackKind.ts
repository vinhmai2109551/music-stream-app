import type { PlaybackKind } from "@/types/playback"
import type { Track } from "@/types"

/**
 * The source a track plays from: its official YouTube video when it has one, otherwise the audio
 * file in our storage. A track with neither has no source, and nothing else is played instead.
 */
export function getPlaybackKind(track: Pick<Track, "youtubeVideoId" | "audioUrl">): PlaybackKind {
  if (track.youtubeVideoId) return "youtube"
  if (track.audioUrl) return "r2"
  return "none"
}

/** Pictures of a video, best first: the full-size one (not every video has it), then a small one. */
export const youtubeThumbnailUrls = (videoId: string): string[] => [
  `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
]

/** Link that opens the video in the YouTube app or the browser. */
export const youtubeWatchUrl = (videoId: string): string =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
