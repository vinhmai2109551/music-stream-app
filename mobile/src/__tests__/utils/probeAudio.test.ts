import { describe, expect, it } from "@jest/globals"
import { probeAudio } from "@/utils/probeAudio"

describe("probeAudio", () => {
  const respond = (status: number) =>
    (async () => ({ ok: status < 400, status }) as Response) as typeof fetch
  it("maps statuses", async () => {
    expect(await probeAudio("u", respond(200))).toBe("ok")
    expect(await probeAudio("u", respond(404))).toBe("missing")
    expect(await probeAudio("u", respond(403))).toBe("missing")
    expect(await probeAudio("u", respond(410))).toBe("missing")
    expect(await probeAudio("u", respond(500))).toBe("network")
  })
  it("treats a failed request as network and uses HEAD", async () => {
    let method = ""
    const failing = (async (_url: string, init?: RequestInit) => {
      method = String(init?.method)
      throw new TypeError("offline")
    }) as unknown as typeof fetch
    expect(await probeAudio("u", failing)).toBe("network")
    expect(method).toBe("HEAD")
  })
  it("gives up after the timeout", async () => {
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
      })) as unknown as typeof fetch
    expect(await probeAudio("u", hanging, 20)).toBe("network")
  })
})
