import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { api, ApiError, configureApi } from "@/api/client"
import { copy } from "@/constants/copy"
import { settle } from "../helpers/playback"

type FakeResponse = { status: number; ok: boolean; text: () => Promise<string> }

const reply = (status: number, body?: unknown): FakeResponse => ({
  status,
  ok: status >= 200 && status < 300,
  text: async () =>
    body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body),
})

const fetchMock = jest.fn<(url: string, init?: RequestInit) => Promise<FakeResponse>>()
const getToken = jest.fn<() => string | null>()
const refreshSession = jest.fn<() => Promise<string | null>>()
const onUnauthorized = jest.fn<() => void>()

/** The Authorization header a call to fetch carried. */
const authOf = (call: unknown[]): string | undefined =>
  (call[1] as RequestInit | undefined)?.headers
    ? ((call[1] as RequestInit).headers as Record<string, string>).Authorization
    : undefined

beforeEach(() => {
  fetchMock.mockReset()
  getToken.mockReset().mockReturnValue("old")
  refreshSession.mockReset()
  onUnauthorized.mockReset()
  configureApi({ getToken, refreshSession, onUnauthorized })
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  jest.useRealTimers()
})

describe("a plain request", () => {
  it("sends the token and the JSON body, and returns the parsed answer", async () => {
    fetchMock.mockResolvedValue(reply(200, { plays: 3 }))

    const result = await api.post<{ plays: number }>("/tracks/t1/play", { a: 1 })

    expect(result).toEqual({ plays: 3 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("http://api.test/api/tracks/t1/play")
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ a: 1 }) })
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer old",
      "Content-Type": "application/json",
      Accept: "application/json",
    })
  })

  it("sends no Content-Type without a body and copes with an empty answer", async () => {
    fetchMock.mockResolvedValue(reply(204))

    const result = await api.delete<void>("/comments/c1")

    expect(result).toBeUndefined()
    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>)["Content-Type"]).toBe(
      undefined,
    )
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE")
  })

  it("uses the right method for each helper", async () => {
    fetchMock.mockResolvedValue(reply(200, {}))

    await api.get("/x")
    await api.patch("/x", {})
    await api.put("/x")

    expect(fetchMock.mock.calls.map((call) => call[1]?.method)).toEqual(["GET", "PATCH", "PUT"])
  })

  it("sends no token when there is none", async () => {
    getToken.mockReturnValue(null)
    fetchMock.mockResolvedValue(reply(200, {}))

    await api.get("/tracks")

    expect(authOf(fetchMock.mock.calls[0])).toBeUndefined()
  })

  it("skipAuth sends no token and never refreshes or signs out on a 401", async () => {
    fetchMock.mockResolvedValue(reply(401, { message: "Invalid email or password" }))

    await expect(api.post("/auth/login", {}, { skipAuth: true })).rejects.toMatchObject({
      status: 401,
    })

    expect(authOf(fetchMock.mock.calls[0])).toBeUndefined()
    expect(refreshSession).not.toHaveBeenCalled()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe("401 and the token refresh", () => {
  /** The server accepts only the "new" token. */
  const serverWantsNewToken = () =>
    fetchMock.mockImplementation(async (_url, init) =>
      (init?.headers as Record<string, string>).Authorization === "Bearer new"
        ? reply(200, { ok: true })
        : reply(401, { message: "Unauthorized" }),
    )

  it("refreshes, then retries the request once with the new token", async () => {
    serverWantsNewToken()
    refreshSession.mockResolvedValue("new")

    const result = await api.get<{ ok: boolean }>("/auth/me")

    expect(result).toEqual({ ok: true })
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls.map(authOf)).toEqual(["Bearer old", "Bearer new"])
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it("requests that fail together share ONE refresh and are all retried", async () => {
    serverWantsNewToken()
    let release: (token: string) => void = () => {}
    refreshSession.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          release = resolve
        }),
    )

    const calls = [api.get("/a"), api.get("/b"), api.get("/c")]
    await Promise.resolve()
    await settle()
    getToken.mockReturnValue("new") // what the store holds once the refresh succeeded
    release("new")
    const results = await Promise.all(calls)

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }])
    expect(refreshSession).toHaveBeenCalledTimes(1)
    const retried = fetchMock.mock.calls.filter((call) => authOf(call) === "Bearer new")
    expect(retried).toHaveLength(3)
  })

  it("a request that was rejected with a token the app already replaced reuses the new one", async () => {
    serverWantsNewToken()
    getToken
      .mockReturnValueOnce("old") // the request starts with the old token
      .mockReturnValue("new") // ...but by the time it fails, the store has the new one

    const result = await api.get<{ ok: boolean }>("/late")

    expect(result).toEqual({ ok: true })
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it("signs out when the refresh token is rejected (refresh answers null)", async () => {
    fetchMock.mockResolvedValue(reply(401, { message: "Unauthorized" }))
    refreshSession.mockResolvedValue(null)

    await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 401 })

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // no retry without a new token
  })

  it("keeps the session when the refresh fails for network reasons", async () => {
    fetchMock.mockResolvedValue(reply(401, { message: "Unauthorized" }))
    const offline = new ApiError({ status: 0, kind: "network", message: copy.errors.network })
    refreshSession.mockRejectedValue(offline)

    await expect(api.get("/auth/me")).rejects.toBe(offline)

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it("retries only once: a second 401 signs out", async () => {
    fetchMock.mockResolvedValue(reply(401, { message: "Unauthorized" }))
    refreshSession.mockResolvedValue("new")

    await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it("a retry that fails differently is reported as is, without signing out", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(reply(500, { message: "boom" }))
    refreshSession.mockResolvedValue("new")

    await expect(api.get("/x")).rejects.toMatchObject({ status: 500 })

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it.each([403, 404, 500])("a %i does not start a refresh", async (status) => {
    fetchMock.mockResolvedValue(reply(status, { message: "nope" }))

    await expect(api.get("/x")).rejects.toMatchObject({ status })

    expect(refreshSession).not.toHaveBeenCalled()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it("a request without a token that gets a 401 does not refresh", async () => {
    getToken.mockReturnValue(null)
    fetchMock.mockResolvedValue(reply(401, {}))

    await expect(api.get("/x")).rejects.toMatchObject({ status: 401 })

    expect(refreshSession).not.toHaveBeenCalled()
  })

  it("starts a new refresh for a later 401 once the first one is over", async () => {
    serverWantsNewToken()
    refreshSession.mockResolvedValue("new")
    await api.get("/one")
    getToken.mockReturnValue("old") // the store went back to a stale token for this test

    await api.get("/two")

    expect(refreshSession).toHaveBeenCalledTimes(2)
  })
})

describe("failures", () => {
  it("a request that cannot reach the server is a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"))

    const error = await api.get("/x").catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: "network", status: 0, message: copy.errors.network })
  })

  it("a request that takes too long is a timeout", async () => {
    jest.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
        }),
    )

    const pending = api.get("/slow").catch((caught: unknown) => caught)
    jest.advanceTimersByTime(15_000)
    const error = await pending

    expect(error).toMatchObject({ kind: "timeout", status: 0, message: copy.errors.timeout })
  })

  it("joins a list of validation messages into one sentence", async () => {
    fetchMock.mockResolvedValue(
      reply(400, { message: ["email must be an email", "password is too short"] }),
    )

    await expect(api.post("/auth/register", {})).rejects.toMatchObject({
      kind: "http",
      status: 400,
      message: "email must be an email; password is too short",
    })
  })

  it("uses a single message as it is", async () => {
    fetchMock.mockResolvedValue(reply(409, { message: "Email is already registered" }))

    await expect(api.post("/auth/register", {})).rejects.toMatchObject({
      message: "Email is already registered",
    })
  })

  it("ignores non-text entries in a message list and falls back when nothing is left", async () => {
    fetchMock.mockResolvedValue(reply(400, { message: [1, null] }))

    await expect(api.get("/x")).rejects.toMatchObject({ message: copy.errors.unknown })
  })

  it("gives a generic sentence when the body has no message", async () => {
    fetchMock.mockResolvedValueOnce(reply(500, "<html>Bad gateway</html>"))
    fetchMock.mockResolvedValueOnce(reply(400, {}))

    await expect(api.get("/x")).rejects.toMatchObject({ message: copy.errors.server })
    await expect(api.get("/x")).rejects.toMatchObject({ message: copy.errors.unknown })
  })

  it("keeps the parsed body in `details`", async () => {
    fetchMock.mockResolvedValue(reply(400, { message: "bad", extra: 7 }))

    const error = (await api.get("/x").catch((caught: unknown) => caught)) as ApiError

    expect(error.details).toEqual({ message: "bad", extra: 7 })
    expect(error.name).toBe("ApiError")
    expect(error).toBeInstanceOf(Error)
  })
})
