import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import type { PlaybackErrorKind } from "@/types/playback"
import { YouTubeSource } from "@/utils/youtubeSource"
import { r2Track, settle, ytTrack } from "../helpers/playback"

class FakeIframe {
  calls: string[] = []
  time = 0
  length = 0
  pending: ((seconds: number) => void)[] = []
  hold = false
  getCurrentTime() {
    if (this.hold) return new Promise<number>((resolve) => this.pending.push(resolve))
    return Promise.resolve(this.time)
  }
  getDuration() {
    return Promise.resolve(this.length)
  }
  seekTo(seconds: number, ahead: boolean) {
    this.calls.push(`seek:${seconds}:${ahead}`)
  }
}

describe("YouTubeSource", () => {
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ["setImmediate", "clearImmediate", "nextTick", "queueMicrotask"],
    })
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  function ready() {
    const source = new YouTubeSource(100)
    const iframe = new FakeIframe()
    source.load(ytTrack("a"))
    source.attach(iframe as never)
    source.handleReady()
    return { source, iframe }
  }

  it("describes what the view should draw", () => {
    const source = new YouTubeSource(100)
    let notified = 0
    source.subscribeView(() => (notified += 1))
    source.load(ytTrack("a"))
    expect(source.getViewState()).toEqual({ videoId: "vid-a", playing: false, instance: 0 })
    source.play()
    expect(source.getViewState().playing).toBe(true)
    expect(notified).toBe(2)
    const same = source.getViewState()
    expect(source.getViewState()).toBe(same)
    source.load(r2Track("b"))
    expect(source.getViewState().videoId).toBe("vid-a")
  })

  it("asks for the position only while the video plays", async () => {
    const { source, iframe } = ready()
    iframe.time = 12.5
    source.play()
    source.handleState("buffering")
    jest.advanceTimersByTime(100)
    await settle()
    expect(source.getPosition()).toBe(0)
    source.handleState("playing")
    jest.advanceTimersByTime(100)
    await settle()
    expect(source.getPosition()).toBe(12.5)
  })

  it("reads the duration once the player is ready", async () => {
    const source = new YouTubeSource(100)
    const iframe = new FakeIframe()
    iframe.length = 215
    source.attach(iframe as never)
    source.load(ytTrack("a"))
    source.handleReady()
    await settle()
    expect(source.getDuration()).toBe(215)
  })

  it("holds a seek back while the video has not started, then applies it on play", () => {
    const { source, iframe } = ready()
    source.handleState("video cued")
    source.seekTo(30)
    expect(iframe.calls).toEqual([])
    source.play()
    expect(iframe.calls).toEqual(["seek:30:true"])
    source.pause()
    source.handleState("ended")
    source.seekTo(0)
    expect(iframe.calls).toEqual(["seek:30:true"])
    source.play()
    expect(iframe.calls).toEqual(["seek:30:true", "seek:0:true"])
  })

  it("seeks right away while playing or paused", () => {
    const { source, iframe } = ready()
    source.play()
    source.handleState("playing")
    source.seekTo(10)
    source.pause()
    source.handleState("paused")
    source.seekTo(20)
    expect(iframe.calls).toEqual(["seek:10:true", "seek:20:true"])
  })

  it("applies a seek requested before the player was ready", () => {
    const source = new YouTubeSource(100)
    const iframe = new FakeIframe()
    source.attach(iframe as never)
    source.load(ytTrack("a"))
    source.play()
    source.seekTo(15)
    expect(iframe.calls).toEqual([])
    source.handleReady()
    expect(iframe.calls).toEqual(["seek:15:true"])
  })

  it("ignores a position that was asked for before a seek or a new load", async () => {
    const { source, iframe } = ready()
    source.play()
    source.handleState("playing")
    iframe.hold = true
    jest.advanceTimersByTime(100)
    source.seekTo(50)
    iframe.pending.forEach((resolve) => resolve(3))
    await settle()
    expect(source.getPosition()).toBe(50)

    jest.advanceTimersByTime(100)
    source.load(ytTrack("b"))
    iframe.pending.forEach((resolve) => resolve(77))
    await settle()
    expect(source.getPosition()).toBe(0)
  })

  it("tells when the viewer plays or pauses inside the player, but not the answer to our own commands", () => {
    const { source } = ready()
    const seen: boolean[] = []
    source.onPlayingChange((playing) => seen.push(playing))
    source.play()
    source.handleState("paused")
    expect(seen).toEqual([])
    jest.advanceTimersByTime(1100)
    source.handleState("paused")
    expect(seen).toEqual([false])
    source.pause()
    source.handleState("playing")
    expect(seen).toEqual([false])
    jest.advanceTimersByTime(1100)
    source.handleState("playing")
    expect(seen).toEqual([false, true])
    source.handleState("buffering")
    expect(seen).toEqual([false, true])
  })

  it("maps iframe errors", () => {
    const source = new YouTubeSource(100)
    const seen: PlaybackErrorKind[] = []
    source.onError((kind) => seen.push(kind))
    source.handleError("HTML5_error")
    source.handleError("embed_not_allowed")
    source.handleError("video_not_found")
    source.handleError("invalid_parameter")
    source.handleError(undefined)
    source.handleLoadFailure()
    expect(seen).toEqual(["network", "blocked", "blocked", "blocked", "blocked", "network"])
  })

  it("tells when the video ends", () => {
    const source = new YouTubeSource(100)
    let ended = 0
    const stop = source.onEnded(() => (ended += 1))
    source.handleState("ended")
    stop()
    source.handleState("ended")
    expect(ended).toBe(1)
  })

  it("rewinds instead of reloading the same video, and rebuilds a player that never got ready", () => {
    const { source, iframe } = ready()
    source.load(ytTrack("a"))
    expect(iframe.calls).toEqual(["seek:0:true"])
    expect(source.getViewState().instance).toBe(0)

    const stuck = new YouTubeSource(100)
    stuck.load(ytTrack("a"))
    stuck.attach(new FakeIframe() as never)
    expect(stuck.getViewState().instance).toBe(0)
    stuck.load(ytTrack("b"))
    expect(stuck.getViewState().instance).toBe(1)
    expect(stuck.getViewState().videoId).toBe("vid-b")
  })

  it("tells when its player appears and goes away", () => {
    const source = new YouTubeSource(100)
    const seen: boolean[] = []
    source.onAttachedChange((attached) => seen.push(attached))
    expect(source.isAttached()).toBe(false)
    source.attach(new FakeIframe() as never)
    expect(source.isAttached()).toBe(true)
    source.detach()
    expect(source.isAttached()).toBe(false)
    expect(seen).toEqual([true, false])
  })

  it("is loading until the video really plays", () => {
    const source = new YouTubeSource(100)
    source.attach(new FakeIframe() as never)
    source.load(ytTrack("a"))
    expect(source.isLoading()).toBe(false)
    source.play()
    expect(source.isLoading()).toBe(true)
    source.handleReady()
    source.handleState("buffering")
    expect(source.isLoading()).toBe(true)
    source.handleState("playing")
    expect(source.isLoading()).toBe(false)
    source.pause()
    source.handleState("paused")
    expect(source.isLoading()).toBe(false)
  })
})
