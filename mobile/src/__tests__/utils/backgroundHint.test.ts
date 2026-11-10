import { describe, expect, it } from "@jest/globals"
import { BackgroundHint } from "@/utils/backgroundHint"

describe("BackgroundHint", () => {
  it("shows nothing when the app never paused a YouTube track in the background", () => {
    const hint = new BackgroundHint()

    expect(hint.onForeground()).toBe(false)
  })

  it("is shown when the app is back in front after a YouTube track was paused", () => {
    const hint = new BackgroundHint()
    hint.onPausedInBackground()

    expect(hint.onForeground()).toBe(true)
  })

  it("is shown only once per session, however often it happens", () => {
    const hint = new BackgroundHint()
    hint.onPausedInBackground()
    expect(hint.onForeground()).toBe(true)

    hint.onPausedInBackground()
    expect(hint.onForeground()).toBe(false)
    hint.onPausedInBackground()
    expect(hint.onForeground()).toBe(false)
  })

  it("waits for the app to be back: asking again without a new pause gives nothing", () => {
    const hint = new BackgroundHint()
    hint.onPausedInBackground()
    hint.onPausedInBackground()

    expect(hint.onForeground()).toBe(true)
    expect(hint.onForeground()).toBe(false)
  })

  it("every session starts with a new object, so the hint can show again", () => {
    const first = new BackgroundHint()
    first.onPausedInBackground()
    first.onForeground()

    const second = new BackgroundHint()
    second.onPausedInBackground()

    expect(second.onForeground()).toBe(true)
  })
})
