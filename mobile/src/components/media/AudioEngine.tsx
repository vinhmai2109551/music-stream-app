import { useAudioEngine } from "@/hooks/useAudioEngine"
import { usePlayCounter } from "@/hooks/usePlayCounter"

/** Headless component: mount once near the root so playback outlives every screen. */
export function AudioEngine() {
  useAudioEngine()
  usePlayCounter()
  return null
}
