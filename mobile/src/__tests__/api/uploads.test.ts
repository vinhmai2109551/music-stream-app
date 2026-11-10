import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { ApiError, configureApi } from "@/api/client"
import { uploadAvatar } from "@/api/uploads"
import { t } from "@/i18n"

const FILE = { uri: "file:///cache/avatar.jpg", contentType: "image/jpeg" }
const UPLOAD_URL =
  "https://acct.r2.cloudflarestorage.com/bucket/avatars/u1/a1.jpg?X-Amz-Signature=s"
const PUBLIC_URL = "https://media.test/avatars/u1/a1.jpg"
const PRESIGN_URL = "http://api.test/api/users/me/avatar/presign"
const BLOB = { size: 90_123 }

type Call = { url: string; init?: RequestInit }

/** A fetch whose answers depend on where the request goes: the file, the API, or the bucket. */
function route(answers: {
  file?: () => Promise<unknown>
  presign?: () => Promise<unknown>
  put?: (init: RequestInit) => Promise<unknown>
}) {
  const calls: Call[] = []
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    if (url === FILE.uri) return (answers.file ?? (async () => ({ blob: async () => BLOB })))()
    if (url === PRESIGN_URL) {
      return (
        answers.presign ?? (async () => json(200, { uploadUrl: UPLOAD_URL, publicUrl: PUBLIC_URL }))
      )()
    }
    if (url === UPLOAD_URL) return (answers.put ?? (async () => ({ ok: true, status: 200 })))(init!)
    throw new Error(`unexpected request to ${url}`)
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch
  const to = (url: string) => calls.filter((call) => call.url === url)
  return { calls, to }
}

const json = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  text: async () => JSON.stringify(body),
})

beforeEach(() => {
  configureApi({
    getToken: () => "access-1",
    refreshSession: async () => null,
    onUnauthorized: () => undefined,
  })
})

afterEach(() => {
  jest.useRealTimers()
})

describe("uploadAvatar", () => {
  it("asks for a presigned URL, PUTs the file to it and returns the public address", async () => {
    const { calls, to } = route({})

    await expect(uploadAvatar(FILE)).resolves.toBe(PUBLIC_URL)

    expect(calls.map((call) => call.url)).toEqual([FILE.uri, PRESIGN_URL, UPLOAD_URL])
    const [presign] = to(PRESIGN_URL)
    expect(presign.init?.method).toBe("POST")
    expect(JSON.parse(presign.init?.body as string)).toEqual({
      contentType: "image/jpeg",
      sizeBytes: BLOB.size,
    })
    const [put] = to(UPLOAD_URL)
    expect(put.init?.method).toBe("PUT")
    expect(put.init?.body).toBe(BLOB)
  })

  it("signs in to the API but sends nothing of the session to the bucket", async () => {
    const { to } = route({})

    await uploadAvatar(FILE)

    expect((to(PRESIGN_URL)[0].init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-1",
    )
    // The bucket gets exactly the declared content type: it is part of the signature.
    expect(to(UPLOAD_URL)[0].init?.headers).toEqual({ "Content-Type": "image/jpeg" })
  })

  it("declares the size of the file it really sends", async () => {
    const { to } = route({ file: async () => ({ blob: async () => ({ size: 4321 }) }) })

    await uploadAvatar(FILE)

    expect(JSON.parse(to(PRESIGN_URL)[0].init?.body as string)).toMatchObject({ sizeBytes: 4321 })
  })

  describe("when something goes wrong", () => {
    it("a refused presign (picture too big, wrong type) is the server's answer and nothing is uploaded", async () => {
      const { to } = route({
        presign: async () => json(400, { message: "avatar files can be at most 2 MB" }),
      })

      await expect(uploadAvatar(FILE)).rejects.toMatchObject({
        status: 400,
        kind: "http",
        message: "avatar files can be at most 2 MB",
      })
      expect(to(UPLOAD_URL)).toHaveLength(0)
    })

    it("a presign rate limit is reported as 429", async () => {
      route({ presign: async () => json(429, { message: "ThrottlerException" }) })

      await expect(uploadAvatar(FILE)).rejects.toMatchObject({ status: 429 })
    })

    it("the bucket refusing the file says the upload failed", async () => {
      route({ put: async () => ({ ok: false, status: 403 }) })

      await expect(uploadAvatar(FILE)).rejects.toMatchObject({
        status: 403,
        kind: "http",
        message: t("settings.edit.uploadFailed"),
      })
    })

    it("losing the connection during the upload is a network error", async () => {
      route({
        put: async () => {
          throw new TypeError("Network request failed")
        },
      })

      await expect(uploadAvatar(FILE)).rejects.toMatchObject({
        kind: "network",
        message: t("errors.network"),
      })
    })

    it("an upload that never finishes is cut off after 30 seconds", async () => {
      jest.useFakeTimers()
      route({
        put: (init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new Error("aborted")))
          }),
      })

      const result = uploadAvatar(FILE)
      const assertion = expect(result).rejects.toMatchObject({
        kind: "timeout",
        message: t("errors.timeout"),
      })
      await jest.advanceTimersByTimeAsync(30_000)

      await assertion
    })

    it.each([
      ["a file that cannot be opened", async () => Promise.reject(new Error("ENOENT"))],
      ["an empty file", async () => ({ blob: async () => ({ size: 0 }) })],
    ])("%s is reported without calling the API", async (_name, file) => {
      const { calls } = route({ file })

      const error: unknown = await uploadAvatar(FILE).catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).message).toBe(t("settings.edit.readFailed"))
      expect(calls).toHaveLength(1)
    })
  })
})
