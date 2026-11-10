import { Share } from "react-native"
import type { Track } from "@/types"
import { youtubeWatchUrl } from "@/utils/playbackKind"

/** What a shared track says: its name and artist, and the link of its official video if it has one. */
export function trackShareMessage(track: Pick<Track, "title" | "artist" | "youtubeVideoId">) {
  const line = `${track.title} - ${track.artist}`
  return track.youtubeVideoId ? `${line}\n${youtubeWatchUrl(track.youtubeVideoId)}` : line
}

/**
 * Opens the share sheet of the phone for a track. Resolves whether the user shared or dismissed it;
 * rejects only when the sheet could not be opened.
 */
export async function shareTrack(
  track: Pick<Track, "title" | "artist" | "youtubeVideoId">,
): Promise<void> {
  // `title` is the heading of the sheet on Android; iOS ignores it.
  await Share.share({ message: trackShareMessage(track), title: track.title })
}
