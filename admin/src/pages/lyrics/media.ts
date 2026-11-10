/** What the editor needs from whatever plays the song (an audio file, or a YouTube video). */
export interface MediaController {
  /** Where the song is now, in ms. */
  getTimeMs(): number
  seekToMs(ms: number): void
  play(): void
  pause(): void
  isPlaying(): boolean
}

const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api"
let youtubeApi: Promise<YTNamespace> | null = null

/** Loads the YouTube IFrame API once; later calls get the same answer. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  youtubeApi ??= new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
      else reject(new Error("YouTube IFrame API không khả dụng."))
    }
    const script = document.createElement("script")
    script.src = YOUTUBE_API_URL
    script.async = true
    script.onerror = () => {
      youtubeApi = null // allow another try
      reject(new Error("Không tải được YouTube IFrame API. Kiểm tra mạng."))
    }
    document.head.appendChild(script)
  })
  return youtubeApi
}

/** `getCurrentTime()` of a YouTube player in ms. */
export const youtubeTimeMs = (player: YTPlayer): number =>
  Math.round(player.getCurrentTime() * 1000)
