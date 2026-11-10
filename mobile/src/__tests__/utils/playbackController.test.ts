import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { usePlayerStore } from "@/store/playerStore"
import { PlaybackController } from "@/utils/playbackController"
import type { ProbeResult } from "@/utils/probeAudio"
import { advance, FakeSource, noSourceTrack, r2Track, settle, ytTrack } from "../helpers/playback"
import { t } from "@/i18n"

const store = usePlayerStore

describe("PlaybackController", () => {
  let controller: PlaybackController | null = null
  const probe = { result: "ok" as ProbeResult, urls: [] as string[] }

  function setup(options: Record<string, number> = {}) {
    const r2 = new FakeSource("r2")
    const youtube = new FakeSource("youtube")
    const toasts: string[] = []
    controller = new PlaybackController({
      store,
      r2,
      youtube,
      notify: (message) => toasts.push(message),
      probe: async (url) => {
        probe.urls.push(url)
        return probe.result
      },
      options: {
        pollMs: 10,
        loadTimeoutMs: 100,
        playerScreenGraceMs: 50,
        autoSkipMs: 30,
        ...options,
      },
    })
    controller.start()
    return { r2, youtube, toasts }
  }

  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ["setImmediate", "clearImmediate", "nextTick", "queueMicrotask"],
    })
    store.getState().reset()
    probe.result = "ok"
    probe.urls = []
  })
  afterEach(() => {
    controller?.dispose()
    controller = null
    jest.useRealTimers()
  })

  it("plays an audio-file track on the R2 source only", () => {
    const { r2, youtube } = setup()
    store.getState().playFromList([r2Track("a"), r2Track("b")], 0)
    expect(r2.loaded?.id).toBe("a")
    expect(r2.playing).toBe(true)
    expect(youtube.loaded).toBe(null)
    expect(youtube.calls.includes("unload")).toBeTruthy()
  })

  it("plays a YouTube track on the YouTube source when the player screen is open", () => {
    const { r2, youtube, toasts } = setup()
    store.getState().playFromList([ytTrack("a")], 0)
    expect(youtube.loaded?.id).toBe("a")
    expect(youtube.playing).toBe(true)
    expect(r2.loaded).toBe(null)
    advance(500)
    expect(store.getState().isPlaying).toBe(true)
    expect(toasts).toEqual([])
  })

  it("pauses a YouTube track whose player screen never opens", () => {
    const { youtube, toasts } = setup()
    youtube.attached = false
    store.getState().playFromList([ytTrack("a")], 0)
    advance(40)
    expect(store.getState().isPlaying).toBe(true)
    advance(20)
    expect(store.getState().isPlaying).toBe(false)
    expect(youtube.playing).toBe(false)
    expect(toasts).toEqual([t("player.openPlayerToListen")])
  })

  it("keeps a YouTube track playing when the screen opens in time", () => {
    const { youtube, toasts } = setup()
    youtube.attached = false
    store.getState().playFromList([ytTrack("a")], 0)
    advance(20)
    youtube.setAttached(true)
    advance(300)
    expect(store.getState().isPlaying).toBe(true)
    expect(toasts).toEqual([])
  })

  it("pauses when the player screen closes, not when its view is only rebuilt", () => {
    const { youtube } = setup()
    store.getState().playFromList([ytTrack("a")], 0)
    youtube.setAttached(false)
    youtube.setAttached(true)
    advance(10)
    expect(store.getState().isPlaying).toBe(true)
    youtube.setAttached(false)
    advance(10)
    expect(store.getState().isPlaying).toBe(false)
  })

  it("moves through a queue that mixes both sources", () => {
    const { r2, youtube } = setup()
    store.getState().playFromList([r2Track("a"), ytTrack("b"), r2Track("c")], 0)
    expect(r2.loaded?.id).toBe("a")
    r2.emitEnded()
    expect(store.getState().currentTrack?.id).toBe("b")
    expect(store.getState().source).toBe("youtube")
    expect(youtube.loaded?.id).toBe("b")
    expect(r2.loaded).toBe(null)
    youtube.emitEnded()
    expect(store.getState().currentTrack?.id).toBe("c")
    expect(r2.loaded?.id).toBe("c")
    expect(youtube.loaded).toBe(null)
    r2.emitEnded()
    expect(store.getState().isPlaying).toBe(false)
  })

  it("repeat one seeks to the start of the same track", () => {
    const { r2 } = setup()
    store.getState().playFromList([r2Track("a"), r2Track("b")], 0)
    store.getState().cycleRepeat()
    store.getState().cycleRepeat()
    expect(store.getState().repeat).toBe("one")
    r2.emitEnded()
    expect(store.getState().currentTrack?.id).toBe("a")
    expect(r2.calls.includes("seek:0")).toBeTruthy()
    expect(r2.playing).toBe(true)
  })

  it("passes seeks, pause and resume to the active source", () => {
    const { r2 } = setup()
    store.getState().playFromList([r2Track("a")], 0)
    store.getState().seek(42)
    expect(r2.calls.includes("seek:42")).toBeTruthy()
    store.getState().togglePlaying()
    expect(r2.playing).toBe(false)
    store.getState().togglePlaying()
    expect(r2.playing).toBe(true)
  })

  it("reports position, duration and buffering back to the store", () => {
    const { r2 } = setup()
    store.getState().playFromList([r2Track("a")], 0)
    r2.duration = 187
    r2.position = 12
    advance(10)
    expect(store.getState().progress).toBe(12)
    expect(store.getState().duration).toBe(187)
    expect(store.getState().isBuffering).toBe(false)
    r2.loading = true
    r2.position = 99
    advance(10)
    expect(store.getState().isBuffering).toBe(true)
    expect(store.getState().progress).toBe(12)
  })

  it("fails as a network error when a track never loads, and retries on demand", () => {
    const { r2, toasts } = setup()
    store.getState().playFromList([r2Track("a"), r2Track("b")], 0)
    r2.loading = true
    advance(200)
    expect(store.getState().error).toBe("network")
    expect(store.getState().isPlaying).toBe(false)
    advance(2000)
    expect(store.getState().currentTrack?.id).toBe("a")
    expect(toasts).toEqual([])
    r2.loading = false
    store.getState().togglePlaying()
    expect(store.getState().error).toBe(null)
    expect(r2.calls.filter((call) => call === "load:a").length).toBe(2)
    expect(r2.playing).toBe(true)
  })

  it("switches a refused YouTube video to the audio file when it exists", async () => {
    const { r2, youtube, toasts } = setup()
    store.getState().playFromList([ytTrack("a")], 0)
    youtube.emitError("blocked")
    await settle()
    expect(probe.urls).toEqual(["https://media.example/a.mp3"])
    expect(store.getState().source).toBe("r2")
    expect(store.getState().error).toBe(null)
    expect(r2.loaded?.id).toBe("a")
    expect(r2.playing).toBe(true)
    expect(youtube.loaded).toBe(null)
    expect(toasts).toEqual([])
  })

  it("reports a refused video without an audio file, then skips after 3 s", async () => {
    const { r2, youtube, toasts } = setup({ autoSkipMs: 3000 })
    probe.result = "missing"
    store.getState().playFromList([ytTrack("a"), r2Track("b")], 0)
    youtube.emitError("blocked")
    await settle()
    expect(store.getState().error).toBe("blocked")
    expect(store.getState().isPlaying).toBe(false)
    expect(toasts).toEqual([t("player.cannotPlayInApp")])
    advance(2900, 100)
    expect(store.getState().currentTrack?.id).toBe("a")
    advance(200, 100)
    expect(store.getState().currentTrack?.id).toBe("b")
    expect(store.getState().error).toBe(null)
    expect(r2.loaded?.id).toBe("b")
  })

  it("does not probe when the track has no audio file at all", async () => {
    const { youtube } = setup()
    store.getState().playFromList([ytTrack("a", { audioUrl: "" })], 0)
    youtube.emitError("blocked")
    await settle()
    expect(probe.urls).toEqual([])
    expect(store.getState().error).toBe("blocked")
  })

  it("maps an HTML5 error to a retryable network error without skipping", async () => {
    const { youtube, toasts } = setup()
    store.getState().playFromList([ytTrack("a"), r2Track("b")], 0)
    youtube.emitError("network")
    await settle()
    advance(1000)
    expect(store.getState().error).toBe("network")
    expect(store.getState().currentTrack?.id).toBe("a")
    expect(toasts).toEqual([])
  })

  it("reports a missing audio file and moves on without playing anything else", () => {
    const { r2, toasts } = setup()
    store.getState().playFromList([r2Track("a"), r2Track("b")], 0)
    r2.emitError("missing")
    expect(store.getState().error).toBe("missing")
    expect(toasts).toEqual([t("player.noSource")])
    advance(40)
    expect(store.getState().currentTrack?.id).toBe("b")
    expect(r2.calls.filter((call) => call.startsWith("load:"))).toEqual(["load:a", "load:b"])
  })

  it("plays nothing for a track without any source", () => {
    const { r2, youtube, toasts } = setup()
    store.getState().playFromList([noSourceTrack("a"), r2Track("b")], 0)
    expect(store.getState().error).toBe("unavailable")
    expect(r2.loaded).toBe(null)
    expect(youtube.loaded).toBe(null)
    expect(!r2.calls.some((call) => call.startsWith("load:"))).toBeTruthy()
    expect(toasts).toEqual([t("player.noSource")])
    advance(40)
    expect(store.getState().currentTrack?.id).toBe("b")
    expect(r2.loaded?.id).toBe("b")
  })

  it("stays put on the last track and when every track is broken", () => {
    const { r2 } = setup()
    store.getState().playFromList([r2Track("a")], 0)
    r2.emitError("missing")
    advance(500)
    expect(store.getState().currentTrack?.id).toBe("a")
    expect(store.getState().error).toBe("missing")

    store.getState().reset()
    store.getState().playFromList([r2Track("a"), r2Track("b"), r2Track("c")], 0)
    for (let step = 0; step < 3; step += 1) {
      r2.emitError("missing")
      advance(40)
    }
    advance(500)
    expect(store.getState().currentTrack?.id).toBe("c")
    expect(store.getState().error).toBe("missing")
  })

  it("follows a play or pause made inside the YouTube player", () => {
    const { youtube } = setup()
    store.getState().playFromList([ytTrack("a")], 0)
    youtube.emitPlaying(false)
    expect(store.getState().isPlaying).toBe(false)
    expect(youtube.playing).toBe(false)
    youtube.emitPlaying(true)
    expect(store.getState().isPlaying).toBe(true)
    expect(youtube.playing).toBe(true)
  })

  it("ignores the YouTube player's taps while an audio file is playing", () => {
    const { youtube } = setup()
    store.getState().playFromList([r2Track("a")], 0)
    youtube.emitPlaying(false)
    expect(store.getState().isPlaying).toBe(true)
  })

  it("pauses YouTube, not audio files, when the app goes to the background", () => {
    const { r2, youtube } = setup()
    store.getState().playFromList([r2Track("a"), ytTrack("b")], 0)
    controller?.handleBackground()
    expect(store.getState().isPlaying).toBe(true)
    expect(r2.playing).toBe(true)
    store.getState().next()
    expect(youtube.playing).toBe(true)
    controller?.handleBackground()
    expect(store.getState().isPlaying).toBe(false)
    expect(youtube.playing).toBe(false)
  })

  it("handleBackground says whether it stopped a YouTube track that was playing", () => {
    const { r2 } = setup()
    store.getState().playFromList([r2Track("a"), ytTrack("b"), ytTrack("c")], 0)
    expect(controller?.handleBackground()).toBe(false) // an audio file keeps playing
    expect(r2.playing).toBe(true)

    store.getState().next() // b, a YouTube track
    expect(controller?.handleBackground()).toBe(true)
    expect(controller?.handleBackground()).toBe(false) // already paused: nothing was stopped

    store.getState().next() // c
    store.getState().pause()
    expect(controller?.handleBackground()).toBe(false)
  })

  it("handleBackground does nothing when no track is loaded", () => {
    setup()

    expect(controller?.handleBackground()).toBe(false)
  })

  it("stops everything when the queue is cleared", () => {
    const { r2, youtube } = setup()
    store.getState().playFromList([r2Track("a")], 0)
    store.getState().reset()
    expect(r2.loaded).toBe(null)
    expect(youtube.loaded).toBe(null)
    r2.position = 99
    advance(50)
    expect(store.getState().progress).toBe(0)
  })

  it("ignores a late answer about an earlier track", async () => {
    const { youtube } = setup()
    probe.result = "ok"
    store.getState().playFromList([ytTrack("a"), r2Track("b")], 0)
    youtube.emitError("blocked")
    store.getState().next()
    await settle()
    expect(store.getState().currentTrack?.id).toBe("b")
    expect(store.getState().source).toBe("r2")
    expect(store.getState().error).toBe(null)
  })
})
