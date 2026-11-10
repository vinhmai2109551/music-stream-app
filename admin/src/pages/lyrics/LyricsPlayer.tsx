import { Alert, Spin } from "antd"
import { useEffect, useRef, useState } from "react"
import type { TrackView } from "@/api/types"
import { loadYouTubeApi, youtubeTimeMs, type MediaController } from "./media"

interface Props {
  track: Pick<TrackView, "audioUrl" | "youtubeVideoId">
  /** Called with the controller when the player is ready, and with null when it goes away. */
  onController: (controller: MediaController | null) => void
}

/** The song's own player: `<audio>` for a file, the YouTube IFrame API for a YouTube track. */
export function LyricsPlayer({ track, onController }: Props) {
  if (track.audioUrl) return <AudioPlayer url={track.audioUrl} onController={onController} />
  if (track.youtubeVideoId) {
    return <YouTubePlayer videoId={track.youtubeVideoId} onController={onController} />
  }
  return (
    <Alert
      type="warning"
      showIcon
      message="Bài hát chưa có nguồn phát"
      description="Hãy thêm file âm thanh hoặc video YouTube cho bài hát để đồng bộ lời."
    />
  )
}

function AudioPlayer({ url, onController }: { url: string; onController: Props["onController"] }) {
  const element = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = element.current
    if (!audio) return
    onController({
      getTimeMs: () => Math.round(audio.currentTime * 1000),
      seekToMs: (ms) => {
        audio.currentTime = Math.max(0, ms) / 1000
      },
      play: () => void audio.play().catch(() => undefined),
      pause: () => audio.pause(),
      isPlaying: () => !audio.paused && !audio.ended,
    })
    return () => onController(null)
  }, [onController])

  return <audio ref={element} src={url} controls preload="auto" style={{ width: "100%" }} />
}

function YouTubePlayer({
  videoId,
  onController,
}: {
  videoId: string
  onController: Props["onController"]
}) {
  const container = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const parent = container.current
    if (!parent) return
    // The player replaces its element with an iframe: give it one React does not manage.
    const host = document.createElement("div")
    parent.appendChild(host)
    let player: YTPlayer | null = null
    let cancelled = false

    loadYouTubeApi()
      .then((yt) => {
        if (cancelled) return
        player = new yt.Player(host, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: ({ target }) => {
              setLoading(false)
              onController({
                getTimeMs: () => youtubeTimeMs(target),
                seekToMs: (ms) => target.seekTo(Math.max(0, ms) / 1000, true),
                play: () => target.playVideo(),
                pause: () => target.pauseVideo(),
                isPlaying: () => target.getPlayerState() === yt.PlayerState.PLAYING,
              })
            },
            onError: () => {
              setLoading(false)
              setError(
                "Không phát được video này (có thể chủ video không cho nhúng). Hãy dùng file âm thanh.",
              )
            },
          },
        })
      })
      .catch((reason: unknown) => {
        setLoading(false)
        setError(reason instanceof Error ? reason.message : "Không tải được trình phát YouTube.")
      })

    return () => {
      cancelled = true
      onController(null)
      player?.destroy()
      host.remove()
    }
  }, [videoId, onController])

  return (
    <div>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 8 }} /> : null}
      <Spin spinning={loading}>
        <div
          ref={container}
          style={{ width: "100%", maxWidth: 560, aspectRatio: "16 / 9", background: "#000" }}
        />
      </Spin>
    </div>
  )
}
