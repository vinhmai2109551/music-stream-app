import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import type { Translator, TranslatorUsage } from "./translator.port.js"
import { CHECK_INTERVAL_MS, UsageMonitor } from "./usage-monitor.js"

function translatorWith(usage: () => Promise<TranslatorUsage>): Translator {
  return { translate: jest.fn<Translator["translate"]>(), usage: jest.fn(usage) }
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date("2026-11-09T10:00:00Z"))
})
afterEach(() => {
  jest.useRealTimers()
})

describe("UsageMonitor", () => {
  it("knows nothing before it has asked, and without an engine", () => {
    const warn = jest.fn()
    const without = new UsageMonitor(null, warn)
    expect(without.snapshot()).toEqual({
      configured: false,
      used: null,
      limit: null,
      percent: null,
      warning: false,
    })
    const before = new UsageMonitor(
      translatorWith(async () => ({ used: 1, limit: 2 })),
      warn,
    )
    expect(before.snapshot()).toMatchObject({ configured: true, used: null, percent: null })
  })

  it("reads the usage from the engine", async () => {
    const monitor = new UsageMonitor(
      translatorWith(async () => ({ used: 12_500, limit: 500_000 })),
      jest.fn(),
    )

    expect(await monitor.refresh()).toEqual({
      configured: true,
      used: 12_500,
      limit: 500_000,
      percent: 2.5,
      warning: false,
    })
  })

  it("warns, with numbers only, from 80% on", async () => {
    const warn = jest.fn()
    const monitor = new UsageMonitor(
      translatorWith(async () => ({ used: 400_000, limit: 500_000 })),
      warn,
    )

    const usage = await monitor.refresh()

    expect(usage.warning).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("80%"))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("400000 of 500000"))
  })

  it("does not warn below 80%", async () => {
    const warn = jest.fn()
    const monitor = new UsageMonitor(
      translatorWith(async () => ({ used: 399_999, limit: 500_000 })),
      warn,
    )

    expect((await monitor.refresh()).warning).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  it("adds what each translation was billed to the figure it knows", async () => {
    const monitor = new UsageMonitor(
      translatorWith(async () => ({ used: 100, limit: 1000 })),
      jest.fn(),
    )
    monitor.record(50) // nothing known yet: nothing to add to
    expect(monitor.snapshot().used).toBeNull()

    await monitor.refresh()
    monitor.record(250)

    expect(monitor.snapshot()).toMatchObject({ used: 350, percent: 35 })
  })

  it("reports a limit of zero as unknown, not as infinite use", async () => {
    const monitor = new UsageMonitor(
      translatorWith(async () => ({ used: 5, limit: 0 })),
      jest.fn(),
    )
    expect(await monitor.refresh()).toMatchObject({ percent: null, warning: false })
  })

  describe("checkIfDue", () => {
    it("asks at the first translation, then at most once every ten minutes", async () => {
      const translator = translatorWith(async () => ({ used: 10, limit: 100 }))
      const monitor = new UsageMonitor(translator, jest.fn())

      await monitor.checkIfDue()
      await monitor.checkIfDue()
      expect(translator.usage).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(CHECK_INTERVAL_MS - 1)
      await monitor.checkIfDue()
      expect(translator.usage).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(1)
      await monitor.checkIfDue()
      expect(translator.usage).toHaveBeenCalledTimes(2)
    })

    it("does not ask twice while the first answer is still on its way", async () => {
      let answer: (usage: TranslatorUsage) => void = () => undefined
      const translator = translatorWith(() => new Promise((resolve) => (answer = resolve)))
      const monitor = new UsageMonitor(translator, jest.fn())

      const first = monitor.checkIfDue()
      const second = monitor.checkIfDue()
      answer({ used: 1, limit: 2 })
      await Promise.all([first, second])

      expect(translator.usage).toHaveBeenCalledTimes(1)
    })

    it("never throws: a figure that cannot be read must not fail a translation", async () => {
      const translator = translatorWith(async () => {
        throw new Error("down")
      })
      const monitor = new UsageMonitor(translator, jest.fn())

      await expect(monitor.checkIfDue()).resolves.toBeUndefined()
    })

    it("does nothing without an engine", async () => {
      const monitor = new UsageMonitor(null, jest.fn())
      await expect(monitor.checkIfDue()).resolves.toBeUndefined()
    })
  })

  it("lets refresh fail when asked directly (the administrator should see it)", async () => {
    const monitor = new UsageMonitor(
      translatorWith(async () => {
        throw new Error("down")
      }),
      jest.fn(),
    )
    await expect(monitor.refresh()).rejects.toThrow("down")
  })
})
