import { ArrowLeftOutlined, SaveOutlined, UndoOutlined } from "@ant-design/icons"
import { useOne } from "@refinedev/core"
import { Alert, App, Button, Card, Skeleton, Space, Tabs, Tag, Typography, theme } from "antd"
import { useEffect, useMemo, useReducer, useState } from "react"
import { Link, useParams } from "react-router"
import { describeError } from "@/api/errors"
import type { TrackView } from "@/api/types"
import { lyricsLanguageFor } from "@/lib/languages"
import { validateLyrics } from "@/lib/lyrics-validation"
import { markedCount } from "@/lib/tap-sync"
import { draftReducer, draftToSave, initialDraftState, isDirty } from "./draft"
import { FineTuneTab } from "./FineTuneTab"
import { LrcTools } from "./LrcTools"
import { LyricsPlayer } from "./LyricsPlayer"
import { fetchLyrics, saveLyrics } from "./lyricsApi"
import { LyricsTextTab } from "./LyricsTextTab"
import type { MediaController } from "./media"
import { TapSyncTab } from "./TapSyncTab"
import { TranslationDrawer } from "./TranslationDrawer"
import { useClock } from "./useClock"

type TabKey = "text" | "sync" | "tune"

export function LyricsEditorPage() {
  const { id = "" } = useParams()
  const { notification } = App.useApp()
  const { token } = theme.useToken()
  const { query, result: track } = useOne<TrackView>({ resource: "tracks", id })

  const [state, dispatch] = useReducer(draftReducer, undefined, initialDraftState)
  const [loading, setLoading] = useState<"loading" | "ready" | string>("loading")
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabKey>("text")
  const [controller, setController] = useState<MediaController | null>(null)
  const nowMs = useClock(controller, tab !== "text")

  const defaultLanguage = lyricsLanguageFor(track?.language ?? null)
  const trackReady = track !== undefined

  // Load the saved lyrics once the track is known (its language is the default for new lyrics).
  useEffect(() => {
    if (!trackReady) return
    const controller = new AbortController()
    fetchLyrics(id, controller.signal)
      .then((lyrics) => {
        dispatch({ type: "loaded", lyrics, defaultLanguage })
        setLoading("ready")
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoading(describeError(error))
      })
    return () => controller.abort()
    // The language only matters for the very first load of a track without lyrics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, trackReady])

  const { draft, saved } = state
  const dirty = isDirty(state)
  const toSave = useMemo(() => draftToSave(draft), [draft])
  const errors = useMemo(() => validateLyrics(toSave), [toSave])
  const syncing = draft.timingsMs === null && markedCount(draft.lines, draft.marks) > 0

  // Leaving or reloading the page with unsaved work asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const save = async () => {
    setSaving(true)
    try {
      const lyrics = await saveLyrics(id, toSave)
      dispatch({ type: "saved", lyrics })
      notification.success({
        message: "Đã lưu lời bài hát",
        description: lyrics.timingsMs
          ? "Lời có mốc thời gian cho từng dòng."
          : "Lời chưa có mốc thời gian.",
      })
    } catch (error) {
      notification.error({ message: "Không lưu được lời", description: describeError(error) })
    } finally {
      setSaving(false)
    }
  }

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được bài hát"
        description={query.error.message}
      />
    )
  }
  if (!track || loading === "loading") {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    )
  }
  if (loading !== "ready") {
    return (
      <Alert type="error" showIcon message="Không tải được lời bài hát" description={loading} />
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space align="center" wrap>
        <Link to={`/tracks/edit/${id}`}>
          <Button icon={<ArrowLeftOutlined />}>Quay lại bài hát</Button>
        </Link>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Lời bài hát: {track.title}
          </Typography.Title>
          <Typography.Text type="secondary">{track.artist}</Typography.Text>
        </div>
        {saved ? (
          <Tag color={saved.timingsMs ? "green" : "gold"}>
            {saved.timingsMs ? "Đã đồng bộ" : "Có lời"}
          </Tag>
        ) : (
          <Tag>Chưa có lời</Tag>
        )}
      </Space>

      <Alert
        type="info"
        showIcon
        message="Chỉ lưu lời do bạn tự viết hoặc lời bạn có bản quyền / giấy phép sử dụng."
        description="Lời được lưu với nguồn “manual”. Không sao chép lời của bài hát thương mại khi chưa được phép."
      />

      <LyricsPlayer track={track} onController={setController} />

      <Space wrap>
        <LrcTools
          draft={draft}
          fileName={track.title}
          onImport={(lines, timingsMs) => dispatch({ type: "import", lines, timingsMs })}
        />
        <TranslationDrawer
          trackId={id}
          language={saved?.language ?? draft.language}
          unsaved={dirty}
          hasSaved={saved !== null}
          originalLines={saved?.lines ?? []}
        />
      </Space>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as TabKey)}
        items={[
          {
            key: "text",
            label: "Lời",
            children: (
              <LyricsTextTab
                // A new text from elsewhere (an import, a revert) replaces what is typed here.
                key={draft.lines.join("\n")}
                draft={draft}
                onLanguage={(language) => dispatch({ type: "setLanguage", language })}
                onApply={(lines) => dispatch({ type: "applyText", lines })}
              />
            ),
          },
          {
            key: "sync",
            label: "Đồng bộ (Tap-sync)",
            children: (
              <TapSyncTab
                draft={draft}
                controller={controller}
                nowMs={nowMs}
                durationSec={track.duration}
                active={tab === "sync"}
                onTap={(timeMs) => dispatch({ type: "tap", timeMs })}
                onUndo={() => dispatch({ type: "undoTap" })}
                onReset={() => dispatch({ type: "resetSync" })}
              />
            ),
          },
          {
            key: "tune",
            label: "Tinh chỉnh",
            children: (
              <FineTuneTab
                draft={draft}
                controller={controller}
                nowMs={nowMs}
                onSetTiming={(index, timeMs) => dispatch({ type: "setTiming", index, timeMs })}
                onNudge={(index, deltaMs) => dispatch({ type: "nudge", index, deltaMs })}
                onSetLine={(index, text) => dispatch({ type: "setLine", index, text })}
              />
            ),
          },
        ]}
      />

      {syncing ? (
        <Alert
          type="warning"
          showIcon
          message="Đang đồng bộ dở"
          description="Chưa có mốc cho mọi dòng. Nếu lưu bây giờ, lời sẽ được lưu không kèm mốc thời gian."
        />
      ) : null}
      {dirty && errors.length > 0 ? (
        <Alert
          type="error"
          showIcon
          message="Chưa thể lưu"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          }
        />
      ) : null}

      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 5,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "12px 16px",
          background: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
        }}
      >
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={!dirty || errors.length > 0}
          onClick={() => void save()}
        >
          Lưu lời
        </Button>
        <Button
          icon={<UndoOutlined />}
          disabled={!dirty || saving}
          onClick={() => dispatch({ type: "revert", defaultLanguage })}
        >
          Bỏ thay đổi
        </Button>
        {dirty ? <Tag color="orange">Có thay đổi chưa lưu</Tag> : <Tag>Đã lưu</Tag>}
      </div>
    </Space>
  )
}
