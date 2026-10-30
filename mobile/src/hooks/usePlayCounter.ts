import { useEffect } from "react"
import { recordPlay } from "@/api/tracks"
import { usePlayerStore } from "@/store/playerStore"
import { PlayCounter } from "@/utils/playCounter"

/**
 * Tells the backend about a play once a track has been listened to for 30 seconds
 * (POST /tracks/:id/play), at most once per play. Failures are ignored: a lost count is not
 * worth interrupting the music or the user.
 */
export function usePlayCounter() {
  useEffect(() => {
    const counter = new PlayCounter()
    let currentPlay = ""

    // A subscription (not a hook selector) so playback ticks do not re-render anything.
    return usePlayerStore.subscribe((state) => {
      const track = state.currentTrack
      const play = `${track?.id}:${state.playVersion}`
      if (play !== currentPlay) {
        currentPlay = play
        counter.reset()
      }
      if (!track || !state.isPlaying) return
      if (counter.update(state.progress)) void recordPlay(track.id).catch(() => {})
    })
  }, [])
}
