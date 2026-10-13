/**
 * Royalty-free sample audio (SoundHelix). Replace the URLs here to change what
 * each track plays — nothing else in the app references audio URLs.
 */
const sample = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`

export const AUDIO_URLS: Record<string, string> = {
  flower: sample(1),
  shape: sample(2),
  blinding: sample(3),
  levitating: sample(4),
  astronaut: sample(5),
  dynamite: sample(6),
  me: sample(7),
}

export const FALLBACK_AUDIO_URL = sample(8)

export function getAudioUrl(trackId: string): string {
  return AUDIO_URLS[trackId] ?? FALLBACK_AUDIO_URL
}
