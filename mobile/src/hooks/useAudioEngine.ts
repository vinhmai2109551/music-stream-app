import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { useEffect } from "react"
import { AUDIO_UPDATE_INTERVAL_MS, LOAD_TIMEOUT_MS } from "@/constants/player"
import { getAudioUrl } from "@/constants/audio"
import { usePlayerStore } from "@/store/playerStore"

/**
 * Keeps one expo-audio player in sync with `playerStore`.
 * The store is the source of truth; this hook only applies it and reports back.
 */
export function useAudioEngine() {
  const player = useAudioPlayer(null, { updateInterval: AUDIO_UPDATE_INTERVAL_MS })
  const status = useAudioPlayerStatus(player)

  const trackId = usePlayerStore((state) => state.currentTrack?.id)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playVersion = usePlayerStore((state) => state.playVersion)
  const seekVersion = usePlayerStore((state) => state.seekVersion)

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
  }, [])

  // Load the current track whenever the store asks for a (re)start.
  useEffect(() => {
    if (!trackId) return
    player.replace(getAudioUrl(trackId))
    if (usePlayerStore.getState().isPlaying) player.play()
  }, [player, trackId, playVersion])

  useEffect(() => {
    if (!trackId) {
      // The queue was cleared (e.g. logout): make sure nothing keeps playing.
      if (player.playing) player.pause()
      return
    }
    if (isPlaying) player.play()
    else player.pause()
  }, [player, trackId, isPlaying])

  // Apply seek requests (skip the initial render).
  useEffect(() => {
    if (seekVersion === 0) return
    const { progress, isPlaying: playing } = usePlayerStore.getState()
    player.seekTo(progress).then(() => {
      if (playing) player.play()
    })
  }, [player, seekVersion])

  // Report playback state back to the store.
  useEffect(() => {
    if (!status.isLoaded) return
    const store = usePlayerStore.getState()
    if (status.duration > 0 && store.duration !== status.duration)
      store.setDuration(status.duration)
    if (status.playing) store.setProgress(status.currentTime)
  }, [status.isLoaded, status.duration, status.playing, status.currentTime])

  useEffect(() => {
    usePlayerStore.getState().setBuffering(status.isBuffering || (isPlaying && !status.isLoaded))
  }, [status.isBuffering, status.isLoaded, isPlaying])

  useEffect(() => {
    if (status.didJustFinish) usePlayerStore.getState().handleTrackEnd()
  }, [status.didJustFinish])

  // Give up on tracks that never finish loading (e.g. no network).
  useEffect(() => {
    if (!trackId || !isPlaying || status.isLoaded) return
    const timer = setTimeout(() => usePlayerStore.getState().setError(), LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [trackId, isPlaying, status.isLoaded, playVersion])
}
