import { Tag, Tooltip } from "antd"
import type { LyricsStatus, TrackView } from "@/api/types"
import { REGION_LABELS } from "@/lib/languages"
import type { Region } from "@/api/types"

/** Where a track plays from: its YouTube video, or an audio file in our storage (R2). */
export function PlaybackTag({ track }: { track: Pick<TrackView, "youtubeVideoId" | "audioUrl"> }) {
  if (track.youtubeVideoId) return <Tag color="red">YouTube</Tag>
  if (track.audioUrl) return <Tag color="blue">Audio R2</Tag>
  return <Tag>Chưa có nguồn</Tag>
}

/** None / lyrics / lyrics with a time for every line. */
export function LyricsTag({ status }: { status: LyricsStatus | undefined }) {
  if (!status) return <Tag>…</Tag>
  if (status.hasLyrics && status.hasTimings) {
    return (
      <Tooltip title="Lời có mốc thời gian cho từng dòng">
        <Tag color="green">Đồng bộ</Tag>
      </Tooltip>
    )
  }
  if (status.hasLyrics) return <Tag color="gold">Có lời</Tag>
  return <Tag>Chưa có</Tag>
}

export function RegionTag({ region }: { region: Region }) {
  return <Tag>{REGION_LABELS[region]}</Tag>
}
