import { describe, expect, it, jest } from "@jest/globals"
import { withBackoff } from "./retry.js"

const always = () => true

describe("withBackoff", () => {
  it("returns the result of a task that works at once, without waiting", async () => {
    const sleep = jest.fn(async () => undefined)

    const result = await withBackoff(async () => "ok", {
      attempts: 3,
      baseDelayMs: 1000,
      shouldRetry: always,
      sleep,
    })

    expect(result).toBe("ok")
    expect(sleep).not.toHaveBeenCalled()
  })

  it("tries again after a failure, waiting 1, 2, 4... times the base delay", async () => {
    const task = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("busy"))
      .mockRejectedValueOnce(new Error("busy"))
      .mockRejectedValueOnce(new Error("busy"))
      .mockResolvedValue("done")
    const delays: number[] = []

    const result = await withBackoff(task, {
      attempts: 5,
      baseDelayMs: 1000,
      shouldRetry: always,
      sleep: async (ms) => void delays.push(ms),
    })

    expect(result).toBe("done")
    expect(task).toHaveBeenCalledTimes(4)
    expect(delays).toEqual([1000, 2000, 4000])
  })

  it("gives up after the attempts and throws the last error", async () => {
    const task = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("still busy"))

    await expect(
      withBackoff(task, {
        attempts: 3,
        baseDelayMs: 1,
        shouldRetry: always,
        sleep: async () => undefined,
      }),
    ).rejects.toThrow("still busy")
    expect(task).toHaveBeenCalledTimes(3)
  })

  it("does not retry an error that retrying cannot fix", async () => {
    const task = jest.fn<() => Promise<string>>().mockRejectedValue(new RangeError("bug"))

    await expect(
      withBackoff(task, {
        attempts: 5,
        baseDelayMs: 1,
        shouldRetry: (error) => !(error instanceof RangeError),
        sleep: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(RangeError)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("tells the caller before each wait", async () => {
    const task = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("busy"))
      .mockResolvedValue("done")
    const onRetry = jest.fn()

    await withBackoff(task, {
      attempts: 3,
      baseDelayMs: 500,
      shouldRetry: always,
      onRetry,
      sleep: async () => undefined,
    })

    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 500)
  })
})
