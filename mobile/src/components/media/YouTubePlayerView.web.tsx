import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { StyleSheet, View } from "react-native"
import { YOUTUBE_MIN_SIZE } from "@/constants/player"
import { usePlayerStore } from "@/store/playerStore"
import { colors, radius, shadows, sizes } from "@/theme"
import { youTubeSource, type YouTubePlayerHandle } from "@/utils/youtubeSource"

/** The part of the YouTube IFrame API this view uses. */
interface WebYouTubePlayer {
  playVideo(): void
  pauseVideo(): void
  loadVideoById(videoId: string): void
  cueVideoById(videoId: string): void
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      width: string
      height: string
      videoId?: string
      playerVars: Record<string, number>
      events: {
        onReady: () => void
        onStateChange: (event: { data: number }) => void
        onError: (event: { data: number }) => void
      }
    },
  ) => WebYouTubePlayer
}

type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void }

/** The names the YouTube source knows the player states and errors by. */
const STATE_NAMES: Record<number, string> = {
  [-1]: "unstarted",
  0: "ended",
  1: "playing",
  2: "paused",
  3: "buffering",
  5: "video cued",
}
const ERROR_NAMES: Record<number, string> = {
  2: "invalid_parameter",
  5: "HTML5_error",
  100: "video_not_found",
  101: "embed_not_allowed",
  150: "embed_not_allowed",
}

let apiPromise: Promise<YouTubeApi> | null = null

/** Loads YouTube's own IFrame API script once. */
function loadYouTubeApi(): Promise<YouTubeApi> {
  apiPromise ??= new Promise<YouTubeApi>((resolve, reject) => {
    const youtubeWindow = window as YouTubeWindow
    if (youtubeWindow.YT?.Player) {
      resolve(youtubeWindow.YT)
      return
    }
    const previous = youtubeWindow.onYouTubeIframeAPIReady
    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (youtubeWindow.YT) resolve(youtubeWindow.YT)
    }
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.onerror = () => {
      apiPromise = null
      reject(new Error("The YouTube player could not be loaded"))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

/**
 * The official YouTube player of the current track, in the browser (the web build is only used to
 * preview the app). Same job as the phone's view: `youTubeSource` decides what plays.
 */
export function YouTubePlayerView() {
  const view = useSyncExternalStore(youTubeSource.subscribeView, youTubeSource.getViewState)
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<WebYouTubePlayer | null>(null)
  const loadedVideo = useRef<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    // The source can be attached right away; the player answers once the API has loaded.
    const handle: YouTubePlayerHandle = {
      getCurrentTime: async () => playerRef.current?.getCurrentTime() ?? 0,
      getDuration: async () => playerRef.current?.getDuration() ?? 0,
      seekTo: (seconds, allowSeekAhead) => playerRef.current?.seekTo(seconds, allowSeekAhead),
    }
    youTubeSource.attach(handle)

    loadYouTubeApi()
      .then((api) => {
        if (cancelled) return
        const initial = youTubeSource.getViewState().videoId
        const target = document.createElement("div")
        host.appendChild(target)
        loadedVideo.current = initial
        const player: WebYouTubePlayer = new api.Player(target, {
          width: "100%",
          height: "100%",
          videoId: initial ?? undefined,
          playerVars: {
            controls: 0,
            rel: 0,
            fs: 0,
            playsinline: 1,
            start: Math.floor(usePlayerStore.getState().progress),
          },
          events: {
            onReady: () => {
              playerRef.current = player
              youTubeSource.handleReady()
              setReady(true)
            },
            onStateChange: (event) => youTubeSource.handleState(STATE_NAMES[event.data] ?? ""),
            onError: (event) => youTubeSource.handleError(ERROR_NAMES[event.data]),
          },
        })
      })
      .catch(() => youTubeSource.handleLoadFailure())

    return () => {
      cancelled = true
      youTubeSource.detach()
      playerRef.current?.destroy()
      playerRef.current = null
      host.replaceChildren()
    }
  }, [])

  // Follow the source: another video, play or pause.
  useEffect(() => {
    const player = playerRef.current
    if (!ready || !player || !view.videoId) return
    if (loadedVideo.current !== view.videoId) {
      loadedVideo.current = view.videoId
      if (view.playing) player.loadVideoById(view.videoId)
      else player.cueVideoById(view.videoId)
    } else if (view.playing) {
      player.playVideo()
    } else {
      player.pauseVideo()
    }
  }, [ready, view.videoId, view.playing])

  return (
    <View style={styles.shadow}>
      <View accessibilityLabel="Video player" style={styles.frame}>
        <div ref={hostRef} style={HOST_STYLE} />
      </View>
    </View>
  )
}

const HOST_STYLE = { width: "100%", height: "100%" } as const

const styles = StyleSheet.create({
  shadow: {
    width: "100%",
    maxWidth: sizes.playerArtworkMax,
    maxHeight: "100%",
    minWidth: YOUTUBE_MIN_SIZE,
    minHeight: YOUTUBE_MIN_SIZE,
    aspectRatio: 1,
    alignSelf: "center",
    ...shadows.card,
  },
  frame: {
    flex: 1,
    overflow: "hidden",
    borderRadius: radius.card,
    backgroundColor: colors.black,
  },
})
