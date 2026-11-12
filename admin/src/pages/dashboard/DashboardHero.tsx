import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons"
import { Button, Skeleton } from "antd"
import { useState } from "react"
import { useNavigate } from "react-router"
import { fillTo, greetingFor } from "@/lib/greeting"

interface Props {
  /** Who is logged in; the greeting waits for it. */
  name: string | undefined
  /** Covers of the most played tracks: the banner is made of them. */
  covers: string[]
  /** The sentence about the activity; null while the numbers load. */
  lead: string | null
}

const ROW_MIN = 8

function CoverRow({ covers, back = false }: { covers: string[]; back?: boolean }) {
  // The row is drawn twice so that it can drift by exactly half its width and start over unseen.
  const row = fillTo(covers, ROW_MIN)
  return (
    <div className={back ? "hero__row hero__row--back" : "hero__row"} aria-hidden="true">
      {[...row, ...row].map((cover, index) => (
        <img
          key={index}
          className="hero__cover"
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  )
}

/**
 * The one bold thing of the dashboard: the colours of the banner come from the most played cover,
 * and two rows of covers drift past. Moving content that lasts more than 5 seconds needs a way to
 * stop it that works without a pointer, so there is a button; the drift also pauses under the
 * pointer, and does not run at all for people who asked for less motion.
 */
export function DashboardHero({ name, covers, lead }: Props) {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const evens = covers.filter((_, index) => index % 2 === 0)
  const odds = covers.filter((_, index) => index % 2 === 1)

  return (
    <section className={paused ? "hero hero--paused" : "hero"} aria-label="Tổng quan">
      {covers[0] ? (
        <div
          className="hero__glow"
          style={{ backgroundImage: `url(${covers[0]})` }}
          aria-hidden="true"
        />
      ) : null}

      <div className="hero__copy">
        <h1 className="hero__title">
          {greetingFor(new Date().getHours())}
          {name ? `, ${name}` : ""}
        </h1>
        {lead === null ? (
          <Skeleton.Input active size="small" style={{ margin: "10px 0 22px", width: 280 }} />
        ) : (
          <p className="hero__lead">{lead}</p>
        )}
        <div className="hero__actions">
          <Button type="primary" size="large" onClick={() => navigate("/tracks/create")}>
            Thêm bài hát
          </Button>
          <Button className="hero__ghost" size="large" onClick={() => navigate("/tracks")}>
            Chọn bài để soạn lời
          </Button>
        </div>
      </div>

      {covers.length > 0 ? (
        <>
          <div className="hero__wall">
            <div className="hero__rows">
              <CoverRow covers={evens.length > 0 ? evens : covers} />
              <CoverRow covers={odds.length > 0 ? odds : covers} back />
            </div>
          </div>
          <Button
            className="hero__pause"
            size="small"
            type="text"
            icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "Chạy ảnh bìa" : "Dừng ảnh bìa"}
          </Button>
        </>
      ) : null}
    </section>
  )
}
