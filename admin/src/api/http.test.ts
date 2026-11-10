import { beforeEach, describe, expect, it, vi } from "vitest"

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

/** A tiny API: /things needs the current access token; /auth/refresh rotates the pair. */
function fakeServer(options: { refreshStatus?: number } = {}) {
  const access = "access-2"
  const refresh = "refresh-2"
  const calls: { path: string; authorization: string | null; body: unknown }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const headers = new Headers(init?.headers)
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
    calls.push({ path: url.pathname, authorization: headers.get("Authorization"), body })
    if (url.pathname.endsWith("/auth/refresh")) {
      if (options.refreshStatus && options.refreshStatus !== 200) {
        return json(options.refreshStatus, { message: "Invalid or expired refresh token" })
      }
      const used = (body as { refreshToken: string }).refreshToken
      if (used !== "refresh-1") return json(401, { message: "Invalid or expired refresh token" })
      return json(200, { accessToken: access, refreshToken: refresh })
    }
    if (headers.get("Authorization") !== `Bearer ${access}`) {
      return json(401, { message: "Unauthorized" })
    }
    return json(200, { ok: true, path: url.pathname })
  })
  return {
    fetchMock,
    calls,
    refreshCalls: () => calls.filter((c) => c.path.endsWith("/auth/refresh")),
  }
}

async function load() {
  vi.resetModules()
  const [http, tokens, errors] = await Promise.all([
    import("./http"),
    import("./tokens"),
    import("./errors"),
  ])
  return { ...http, ...tokens, ...errors }
}

beforeEach(() => {
  vi.stubGlobal("window", {
    location: { origin: "http://localhost:5173" },
    localStorage: memoryStorage(),
  })
})

describe("api: refreshing an expired access token", () => {
  it("refreshes ONCE when several requests meet a 401 together, then retries all of them", async () => {
    const server = fakeServer()
    vi.stubGlobal("fetch", server.fetchMock)
    const { api, tokenStore } = await load()
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })

    const results = await Promise.all([api("/a"), api("/b"), api("/c"), api("/d")])

    expect(results).toHaveLength(4)
    // Refresh tokens rotate: a second refresh with "refresh-1" would be refused (and log out).
    expect(server.refreshCalls()).toHaveLength(1)
    expect(tokenStore.accessToken).toBe("access-2")
    expect(tokenStore.refreshToken).toBe("refresh-2")
    const retried = server.calls.filter(
      (c) => !c.path.endsWith("/auth/refresh") && c.authorization === "Bearer access-2",
    )
    expect(retried).toHaveLength(4)
  })

  it("does not refresh again for later requests (the new token is used)", async () => {
    const server = fakeServer()
    vi.stubGlobal("fetch", server.fetchMock)
    const { api, tokenStore } = await load()
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })

    await api("/a")
    await api("/b")

    expect(server.refreshCalls()).toHaveLength(1)
  })

  it("can refresh again later, when a new 401 comes after the first refresh is over", async () => {
    const server = fakeServer()
    vi.stubGlobal("fetch", server.fetchMock)
    const { api, tokenStore } = await load()
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })
    await api("/a")

    tokenStore.save({ accessToken: "stale", refreshToken: "refresh-1" })
    await api("/b")

    expect(server.refreshCalls()).toHaveLength(2)
  })

  it("logs out (clears the tokens, tells the listeners) when the refresh token is refused", async () => {
    const server = fakeServer({ refreshStatus: 401 })
    vi.stubGlobal("fetch", server.fetchMock)
    const { api, tokenStore, onSessionExpired } = await load()
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })
    const expired = vi.fn()
    onSessionExpired(expired)

    const results = await Promise.allSettled([api("/a"), api("/b")])

    expect(results.every((r) => r.status === "rejected")).toBe(true)
    expect(
      results.map((r) =>
        r.status === "rejected" ? (r.reason as { statusCode: number }).statusCode : 0,
      ),
    ).toEqual([401, 401])
    expect(server.refreshCalls()).toHaveLength(1)
    expect(tokenStore.accessToken).toBeNull()
    expect(tokenStore.refreshToken).toBeNull()
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it("keeps the person logged in when the server is down during the refresh", async () => {
    const server = fakeServer({ refreshStatus: 503 })
    vi.stubGlobal("fetch", server.fetchMock)
    const { api, tokenStore, onSessionExpired } = await load()
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })
    const expired = vi.fn()
    onSessionExpired(expired)

    await expect(api("/a")).rejects.toMatchObject({ statusCode: 503 })

    expect(tokenStore.refreshToken).toBe("refresh-1")
    expect(expired).not.toHaveBeenCalled()
  })

  it("keeps the person logged in when the network fails during the refresh", async () => {
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        calls.push(new URL(String(input)).pathname)
        if (calls.length === 1) return json(401, { message: "Unauthorized" })
        throw new TypeError("Failed to fetch")
      }),
    )
    const { api, tokenStore } = await load()
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })

    await expect(api("/a")).rejects.toMatchObject({ statusCode: 0 })

    expect(tokenStore.refreshToken).toBe("refresh-1")
  })

  it("uses the new tokens of another tab when its refresh got there first", async () => {
    const server = fakeServer()
    vi.stubGlobal("fetch", server.fetchMock)
    const { api, tokenStore } = await load()
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })
    // Another tab used "refresh-1" a moment ago and stored the pair it got; this tab's refresh
    // with the old token is refused, but the stored pair already works.
    server.fetchMock.mockImplementationOnce(async () => json(401, { message: "Unauthorized" }))
    server.fetchMock.mockImplementationOnce(async () => {
      tokenStore.save({ accessToken: "access-2", refreshToken: "refresh-2" })
      return json(401, { message: "Invalid or expired refresh token" })
    })

    await expect(api("/a")).resolves.toMatchObject({ ok: true })

    expect(tokenStore.refreshToken).toBe("refresh-2")
  })

  it("does not try to refresh without a refresh token, or for a call made without auth", async () => {
    const server = fakeServer()
    vi.stubGlobal("fetch", server.fetchMock)
    const { api, tokenStore } = await load()

    await expect(api("/a")).rejects.toMatchObject({ statusCode: 401 })
    tokenStore.save({ accessToken: "access-1", refreshToken: "refresh-1" })
    await expect(api("/a", { auth: false })).rejects.toMatchObject({ statusCode: 401 })

    expect(server.refreshCalls()).toHaveLength(0)
  })
})

describe("api: errors and answers", () => {
  it("turns the message of the API into the message of the error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(403, { statusCode: 403, message: "Not allowed" })),
    )
    const { api } = await load()

    await expect(api("/x")).rejects.toMatchObject({ statusCode: 403, message: "Not allowed" })
  })

  it("joins the messages of a validation error and keeps the code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(400, { message: ["title must be a string", "artistId must be a string"], code: "X" }),
      ),
    )
    const { api } = await load()

    await expect(api("/x")).rejects.toMatchObject({
      statusCode: 400,
      message: "title must be a string; artistId must be a string",
      code: "X",
    })
  })

  it("reports an unreachable server as status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    )
    const { api } = await load()

    await expect(api("/x")).rejects.toMatchObject({ statusCode: 0 })
  })

  it("returns undefined for 204 and sends query parameters, skipping empty ones", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      void input
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal("fetch", fetchMock)
    const { api } = await load()

    const result = await api("/things", {
      query: { q: "an", page: 2, region: undefined, empty: "" },
    })

    expect(result).toBeUndefined()
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.searchParams.get("q")).toBe("an")
    expect(url.searchParams.get("page")).toBe("2")
    expect(url.searchParams.has("region")).toBe(false)
    expect(url.searchParams.has("empty")).toBe(false)
  })
})
