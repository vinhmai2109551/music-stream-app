import { setAudioModeAsync, useAudioPlayer } from "expo-audio"
import { useEffect } from "react"
import { AppState } from "react-native"
import { AUDIO_UPDATE_INTERVAL_MS } from "@/constants/player"
import { usePlayerStore } from "@/store/playerStore"
import { showToast } from "@/store/toastStore"
import { PlaybackController } from "@/utils/playbackController"
import { R2AudioSource } from "@/utils/r2AudioSource"
import { youTubeSource } from "@/utils/youtubeSource"

/**
 * Plays what `playerStore` says: audio files with expo-audio, official videos with the YouTube
 * player of the player screen. The store is the source of truth; `PlaybackController` applies it.
 */
export function useAudioEngine() {
  const player = useAudioPlayer(null, { updateInterval: AUDIO_UPDATE_INTERVAL_MS })

  // Audio keeps playing with the screen off, and the lock screen can show its controls.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const r2 = new R2AudioSource(player)
    const controller = new PlaybackController({
      store: usePlayerStore,
      r2,
      youtube: youTubeSource,
      notify: showToast,
    })
    controller.start()
    // A YouTube video cannot play in the background, so it pauses there; audio files keep going.
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "background") controller.handleBackground()
    })
    return () => {
      appState.remove()
      controller.dispose()
      r2.dispose()
    }
  }, [player])
}
