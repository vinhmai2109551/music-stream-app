import { describe, expect, it } from "@jest/globals"
import { Semaphore } from "./limiter.js"

/** A task that ends when the test says so. */
function gate() {
  let open: () => void = () => undefined
  const opened = new Promise<void>((resolve) => (open = resolve))
  return { opened, open }
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve))

describe("Semaphore", () => {
  it("runs the tasks and gives their results", async () => {
    const semaphore = new Semaphore(2)
    expect(await semaphore.run(async () => "a")).toBe("a")
  })

  it("never runs more tasks at once than it was told", async () => {
    const semaphore = new Semaphore(2)
    let running = 0
    let most = 0
    const gates = Array.from({ length: 5 }, gate)
    const results = gates.map((g) =>
      semaphore.run(async () => {
        running += 1
        most = Math.max(most, running)
        await g.opened
        running -= 1
      }),
    )

    await tick()
    expect(running).toBe(2)
    for (const g of gates) {
      g.open()
      await tick()
    }
    await Promise.all(results)
    expect(most).toBe(2)
    expect(running).toBe(0)
  })

  it("starts the waiting tasks in the order they came", async () => {
    const semaphore = new Semaphore(1)
    const order: number[] = []
    const first = gate()
    const tasks = [0, 1, 2].map((id) =>
      semaphore.run(async () => {
        order.push(id)
        if (id === 0) await first.opened
      }),
    )

    await tick()
    expect(order).toEqual([0])
    first.open()
    await Promise.all(tasks)
    expect(order).toEqual([0, 1, 2])
  })

  it("passes on the slot of a task that failed", async () => {
    const semaphore = new Semaphore(1)
    const failing = semaphore.run(async () => {
      throw new Error("boom")
    })
    const next = semaphore.run(async () => "still runs")

    await expect(failing).rejects.toThrow("boom")
    await expect(next).resolves.toBe("still runs")
  })

  it("is free again when everything ended", async () => {
    const semaphore = new Semaphore(1)
    await semaphore.run(async () => undefined)
    const second = gate()
    const running = semaphore.run(() => second.opened)
    await tick()
    second.open()
    await running
    await expect(semaphore.run(async () => 1)).resolves.toBe(1)
  })
})
