import { useAudioEngine } from "@/hooks/useAudioEngine"

/** Headless component: mount once near the root so playback outlives every screen. */
export function AudioEngine() {
  useAudioEngine()
  return null
}
