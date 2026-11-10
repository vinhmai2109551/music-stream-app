import { describe, expect, it } from "@jest/globals"
import { PLAY_THRESHOLD_SECONDS, PlayCounter } from "@/utils/playCounter"

/** Feeds the counter one position per 250 ms of real listening, from `from` up to `to` seconds. */
function listen(counter: PlayCounter, from: number, to: number): boolean[] {
  const answers: boolean[] = []
  for (let position = from; position <= to; position += 0.25) answers.push(counter.update(position))
  return answers
}

describe("PlayCounter", () => {
  it("counts only after 30 seconds of real listening, and only once", () => {
    const counter = new PlayCounter()
    const answers = listen(counter, 0, PLAY_THRESHOLD_SECONDS + 20)

    expect(answers.filter(Boolean)).toHaveLength(1)
    // The answer arrives at the 30 s mark, not before.
    const at = answers.findIndex(Boolean) * 0.25
    expect(at).toBeGreaterThanOrEqual(PLAY_THRESHOLD_SECONDS)
    expect(at).toBeLessThan(PLAY_THRESHOLD_SECONDS + 0.5)
  })

  it("does not count 29 seconds", () => {
    const counter = new PlayCounter()

    expect(listen(counter, 0, 29).some(Boolean)).toBe(false)
  })

  it("the first position only starts the measuring", () => {
    const counter = new PlayCounter()

    expect(counter.update(100)).toBe(false)
  })

  it("skipping ahead does not count as listening", () => {
    const counter = new PlayCounter()
    listen(counter, 0, 10) // 10 s listened
    // Jump to 200 s: a seek, not 190 s of listening.
    expect(counter.update(200)).toBe(false)
    // Another 15 s of listening is only 25 s in total.
    expect(listen(counter, 200, 215).some(Boolean)).toBe(false)
    // 5 more seconds makes 30.
    expect(listen(counter, 215, 221).some(Boolean)).toBe(true)
  })

  it("a series of big forward jumps never counts", () => {
    const counter = new PlayCounter()
    counter.update(0)

    for (let position = 10; position <= 600; position += 10) {
      expect(counter.update(position)).toBe(false)
    }
  })

  it("going back to the start is a new play, counted again after another 30 seconds", () => {
    const counter = new PlayCounter()
    expect(listen(counter, 0, 35).filter(Boolean)).toHaveLength(1)

    expect(counter.update(0)).toBe(false) // jumped back: a new play begins
    const again = listen(counter, 0, 35)

    expect(again.filter(Boolean)).toHaveLength(1)
  })

  it("a restart before the threshold throws away what was heard", () => {
    const counter = new PlayCounter()
    listen(counter, 0, 25)
    counter.update(0) // restart
    expect(listen(counter, 0, 10).some(Boolean)).toBe(false) // 10 s, not 35 s
  })

  it("a small step back is not a restart and adds nothing", () => {
    const counter = new PlayCounter()
    listen(counter, 0, 20)
    counter.update(18) // back 2 s: less than the restart jump

    expect(listen(counter, 18, 26).some(Boolean)).toBe(false) // 20 + 8 = 28 s
    expect(listen(counter, 26, 29).some(Boolean)).toBe(true) // passes 30 s
  })

  it("reset() starts a brand-new play", () => {
    const counter = new PlayCounter()
    expect(listen(counter, 0, 35).some(Boolean)).toBe(true)

    counter.reset()

    expect(counter.update(0)).toBe(false)
    expect(listen(counter, 0, 29).some(Boolean)).toBe(false)
    expect(listen(counter, 29, 32).some(Boolean)).toBe(true)
  })

  it("a position that does not move adds nothing (paused)", () => {
    const counter = new PlayCounter()
    counter.update(0)
    for (let i = 0; i < 400; i++) expect(counter.update(5)).toBe(false)
  })
})
