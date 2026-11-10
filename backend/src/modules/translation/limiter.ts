/**
 * Lets at most `max` tasks run at the same time; the others wait their turn. DeepL gives no fixed
 * requests-per-second figure and advises capping how many requests are in flight at once.
 */
export class Semaphore {
  private active = 0
  private readonly waiting: (() => void)[] = []

  constructor(private readonly max: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1
      return Promise.resolve()
    }
    // The slot of the task that ends is handed over as it is: `active` does not change.
    return new Promise((resolve) => this.waiting.push(resolve))
  }

  private release(): void {
    const next = this.waiting.shift()
    if (next) next()
    else this.active -= 1
  }
}
