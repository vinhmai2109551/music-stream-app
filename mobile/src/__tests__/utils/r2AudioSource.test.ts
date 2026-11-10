import { describe, expect, it } from "@jest/globals"
import type { PlaybackErrorKind } from "@/types/playback"
import type { ProbeResult } from "@/utils/probeAudio"
import { R2AudioSource } from "@/utils/r2AudioSource"
import { makeTrack, r2Track, settle } from "../helpers/playback"

class FakePlayer {
  calls: string[] = []
  currentTime = 0
  duration = 0
  isLoaded = false
  isBuffering = false
  lockScreen: unknown[] = []
  statusListeners = new Set<(status: { didJustFinish: boolean }) => void>()
  replace(source: string | null) {
    this.calls.push(`replace:${source}`)
  }
  play() {
    this.calls.push("play")
  }
  pause() {
    this.calls.push("pause")
  }
  seekTo(seconds: number) {
    this.calls.push(`seek:${seconds}`)
    return Promise.resolve()
  }
  addListener(_event: string, listener: (status: { didJustFinish: boolean }) => void) {
    this.statusListeners.add(listener)
    return { remove: () => this.statusListeners.delete(listener) }
  }
  setActiveForLockScreen(...args: unknown[]) {
    this.lockScreen = args
    this.calls.push("lock:on")
  }
  clearLockScreenControls() {
    this.calls.push("lock:off")
  }
  finish() {
    this.statusListeners.forEach((listener) => listener({ didJustFinish: true }))
  }
}

describe("R2AudioSource", () => {
  function make(result: ProbeResult = "ok") {
    const player = new FakePlayer()
    const probed: string[] = []
    let release: (value: ProbeResult) => void = () => {}
    const slow = { on: false }
    const source = new R2AudioSource(player as never, (url) => {
      probed.push(url)
      return slow.on
        ? new Promise<ProbeResult>((resolve) => (release = resolve))
        : Promise.resolve(result)
    })
    const errors: PlaybackErrorKind[] = []
    source.onError((kind) => errors.push(kind))
    return { player, source, probed, errors, slow, release: (value: ProbeResult) => release(value) }
  }

  it("loads the audio file of the track and shows it on the lock screen", () => {
    const { player, source, probed } = make()
    source.load(r2Track("a"))
    expect(player.calls).toEqual(["replace:https://media.example/a.mp3", "lock:on"])
    expect(probed).toEqual(["https://media.example/a.mp3"])
    const [active, metadata, options] = player.lockScreen as [
      boolean,
      Record<string, unknown>,
      Record<string, unknown>,
    ]
    expect(active).toBe(true)
    expect(metadata).toEqual({ title: "Title a", artist: "Artist", artworkUrl: "cover.jpg" })
    expect(options.showSeekForward).toBe(true)
    expect(options.seekForwardIntervalSeconds).toBe(15)
  })

  it("reports a missing file, but not a network failure", async () => {
    const missing = make("missing")
    missing.source.load(r2Track("a"))
    await settle()
    expect(missing.errors).toEqual(["missing"])
    for (const result of ["ok", "network"] as const) {
      const other = make(result)
      other.source.load(r2Track("a"))
      await settle()
      expect(other.errors).toEqual([])
    }
  })

  it("a track without an audio file (audioUrl null) is reported as missing and loads nothing", () => {
    const { player, source, probed, errors } = make()

    source.load(makeTrack("video-only", { audioUrl: null }))

    expect(errors).toEqual(["missing"])
    expect(player.calls).toEqual([])
    expect(probed).toEqual([])
  })

  it("ignores the answer about a file that was unloaded in the meantime", async () => {
    const { source, errors, slow, release } = make()
    slow.on = true
    source.load(r2Track("a"))
    source.unload()
    release("missing")
    await settle()
    expect(errors).toEqual([])
  })

  it("does nothing when unloading with nothing loaded", () => {
    const { player, source } = make()
    source.unload()
    expect(player.calls).toEqual([])
    source.load(r2Track("a"))
    source.unload()
    expect(player.calls.slice(-3)).toEqual(["pause", "replace:null", "lock:off"])
  })

  it("tells when a track finishes, until it is disposed", () => {
    const { player, source } = make()
    let ended = 0
    source.onEnded(() => (ended += 1))
    player.finish()
    expect(ended).toBe(1)
    source.dispose()
    player.finish()
    expect(ended).toBe(1)
  })

  it("starts a finished track again when a seek is made while it should play", async () => {
    const { player, source } = make()
    source.load(r2Track("a"))
    source.play()
    player.calls.length = 0
    source.seekTo(30)
    await settle()
    expect(player.calls).toEqual(["seek:30", "play"])
    source.pause()
    player.calls.length = 0
    source.seekTo(10)
    await settle()
    expect(player.calls).toEqual(["seek:10"])
  })

  it("is loading until the file is loaded and not buffering", () => {
    const { player, source } = make()
    expect(source.isLoading()).toBe(true)
    player.isLoaded = true
    expect(source.isLoading()).toBe(false)
    player.isBuffering = true
    expect(source.isLoading()).toBe(true)
  })
})
