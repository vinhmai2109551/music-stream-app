import { Empty, Skeleton } from "antd"
import type { AdminStats } from "@/api/types"
import { formatNumber } from "@/lib/time"

type Top = AdminStats["topTracks"]

/** The most played tracks, best first. The bar under each number is its share of the best one. */
export function TopTracks({ tracks }: { tracks: Top | undefined }) {
  if (!tracks) return <Skeleton active paragraph={{ rows: 5 }} />
  if (tracks.length === 0) return <Empty description="Chưa có bài hát nào" />

  const best = Math.max(...tracks.map((track) => track.plays), 1)
  return (
    <ol className="toplist">
      {tracks.map((track, index) => (
        <li key={track.id} className="toplist__row">
          <span className="toplist__rank">{index + 1}</span>
          <img className="toplist__cover" src={track.coverUrl} alt="" loading="lazy" />
          <div style={{ minWidth: 0 }}>
            <div className="toplist__title">{track.title}</div>
            <div className="toplist__artist">{track.artist}</div>
          </div>
          <div className="toplist__plays">
            <span>{formatNumber(track.plays)} lượt nghe</span>
            <span className="toplist__bar" aria-hidden="true">
              <span style={{ width: `${Math.max(2, (track.plays / best) * 100)}%` }} />
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
