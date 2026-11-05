import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import type { AuthResponse, User } from "@/api/types"
import { settle } from "../helpers/playback"

jest.mock("@/api/auth", () => ({
  login: jest.fn(),
  register: jest.fn(),
  getMe: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}))

const USER: User = {
  id: "u1",
  email: "a@b.co",
  name: "Vinh",
  avatarUrl: null,
  role: "USER",
  isPremium: false,
}
const SESSION: AuthResponse = { accessToken: "access-1", refreshToken: "refresh-1", user: USER }

/**
 * Loads the stores fresh for each test: the auth store remembers its bootstrap in the module, and
 * the secure-store mock keeps its values there too. `require` (not `import()`) because Jest runs
 * these files as CommonJS, and everything must come from the same registry.
 */
function load() {
  jest.resetModules()
  /* eslint-disable @typescript-eslint/no-require-imports */
  const authApi = jest.mocked(require("@/api/auth") as typeof import("@/api/auth"))
  const { ApiError } = require("@/api/client") as typeof import("@/api/client")
  const { useAuthStore } = require("@/store/authStore") as typeof import("@/store/authStore")
  const { usePlayerStore } = require("@/store/playerStore") as typeof import("@/store/playerStore")
  const { useLibraryStore } =
    require("@/store/libraryStore") as typeof import("@/store/libraryStore")
  const { useAppStore } = require("@/store/appStore") as typeof import("@/store/appStore")
  const secure = jest.mocked(require("expo-secure-store") as typeof import("expo-secure-store"))
  const { api } = require("@/api/client") as typeof import("@/api/client")
  /* eslint-enable @typescript-eslint/no-require-imports */
  const http = (status: number) => new ApiError({ status, kind: "http", message: `http ${status}` })
  const offline = () => new ApiError({ status: 0, kind: "network", message: "offline" })
  const stored = (key: string) => secure.getItemAsync(key)
  return {
    api,
    authApi,
    useAuthStore,
    usePlayerStore,
    useLibraryStore,
    useAppStore,
    secure,
    http,
    offline,
    stored,
    /** Pretends the last run of the app left a signed-in session on the device. */
    saveSession: async (user: User | string | null = USER) => {
      await secure.setItemAsync("auth.token", "saved-access")
      await secure.setItemAsync("auth.refresh", "saved-refresh")
      if (user) {
        await secure.setItemAsync(
          "auth.user",
          typeof user === "string" ? user : JSON.stringify(user),
        )
      }
    },
  }
}

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => undefined)
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe("bootstrap", () => {
  it("opens the login screen when nothing is saved, and clears any leftovers", async () => {
    const t = load()

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState()).toMatchObject({ status: "unauthenticated", user: null })
    expect(t.secure.deleteItemAsync).toHaveBeenCalledTimes(3)
    expect(t.authApi.getMe).not.toHaveBeenCalled()
  })

  it("ignores a token that has no refresh token with it (older app version)", async () => {
    const t = load()
    await t.secure.setItemAsync("auth.token", "only-access")

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState().status).toBe("unauthenticated")
    expect(await t.stored("auth.token")).toBeNull()
  })

  it("online: restores the session and keeps the fresh profile from the server", async () => {
    const t = load()
    await t.saveSession()
    const fresh = { ...USER, name: "Renamed", isPremium: true }
    t.authApi.getMe.mockResolvedValue(fresh)

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: fresh,
      token: "saved-access",
      refreshToken: "saved-refresh",
    })
    expect(JSON.parse((await t.stored("auth.user")) ?? "{}")).toEqual(fresh)
  })

  it("offline with a saved profile: opens the app with that profile and keeps the tokens", async () => {
    const t = load()
    await t.saveSession()
    t.authApi.getMe.mockRejectedValue(t.offline())

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState()).toMatchObject({ status: "authenticated", user: USER })
    expect(await t.stored("auth.refresh")).toBe("saved-refresh")
  })

  it("offline without a saved profile: shows the login screen but keeps the tokens", async () => {
    const t = load()
    await t.saveSession(null)
    t.authApi.getMe.mockRejectedValue(t.offline())

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState()).toMatchObject({ status: "unauthenticated", user: null })
    expect(await t.stored("auth.refresh")).toBe("saved-refresh")
  })

  it("a corrupt saved profile is dropped instead of crashing", async () => {
    const t = load()
    await t.saveSession("{not json")
    t.authApi.getMe.mockRejectedValue(t.offline())

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState()).toMatchObject({ status: "unauthenticated", user: null })
  })

  it("refresh token rejected (401): the session is over, everything is cleared", async () => {
    const t = load()
    await t.saveSession()
    t.usePlayerStore.setState({ queue: [], isPlaying: true })
    t.authApi.getMe.mockRejectedValue(t.http(401))

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState()).toMatchObject({
      status: "unauthenticated",
      user: null,
      token: null,
      refreshToken: null,
    })
    expect(await t.stored("auth.token")).toBeNull()
    expect(await t.stored("auth.refresh")).toBeNull()
    expect(t.usePlayerStore.getState().isPlaying).toBe(false)
    expect(t.useAppStore.getState().hasStarted).toBe(true) // goes straight to the login screen
  })

  it("a server error keeps the saved session like being offline", async () => {
    const t = load()
    await t.saveSession()
    t.authApi.getMe.mockRejectedValue(t.http(500))

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState().status).toBe("authenticated")
  })

  it("restores only once, however often it is called", async () => {
    const t = load()
    await t.saveSession()
    t.authApi.getMe.mockResolvedValue(USER)

    await Promise.all([
      t.useAuthStore.getState().bootstrap(),
      t.useAuthStore.getState().bootstrap(),
    ])
    await t.useAuthStore.getState().bootstrap()

    expect(t.authApi.getMe).toHaveBeenCalledTimes(1)
  })

  it("survives a secure store that cannot be read", async () => {
    const t = load()
    t.secure.getItemAsync.mockRejectedValue(new Error("keystore locked"))

    await t.useAuthStore.getState().bootstrap()

    expect(t.useAuthStore.getState().status).toBe("unauthenticated")
  })
})

describe("login and register", () => {
  it("login saves the session and signs the user in", async () => {
    const t = load()
    t.authApi.login.mockResolvedValue(SESSION)

    await t.useAuthStore
      .getState()
      .login({ email: "a@b.co", password: "pw", turnstileToken: "tok" })

    expect(t.authApi.login).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "pw",
      turnstileToken: "tok",
    })
    expect(t.useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: USER,
      token: "access-1",
      refreshToken: "refresh-1",
    })
    expect(await t.stored("auth.token")).toBe("access-1")
    expect(await t.stored("auth.refresh")).toBe("refresh-1")
    expect(JSON.parse((await t.stored("auth.user")) ?? "{}")).toEqual(USER)
  })

  it("register does the same", async () => {
    const t = load()
    t.authApi.register.mockResolvedValue(SESSION)

    await t.useAuthStore
      .getState()
      .register({ email: "a@b.co", name: "Vinh", password: "password1" })

    expect(t.useAuthStore.getState().status).toBe("authenticated")
    expect(await t.stored("auth.refresh")).toBe("refresh-1")
  })

  it("a refused login leaves the state alone and lets the error through", async () => {
    const t = load()
    t.authApi.login.mockRejectedValue(t.http(401))

    await expect(
      t.useAuthStore.getState().login({ email: "a@b.co", password: "wrong" }),
    ).rejects.toMatchObject({ status: 401 })

    expect(t.useAuthStore.getState().status).toBe("loading")
    expect(await t.stored("auth.token")).toBeNull()
  })

  it("still signs in when the session cannot be written to the device", async () => {
    const t = load()
    t.secure.setItemAsync.mockRejectedValue(new Error("full"))
    t.authApi.login.mockResolvedValue(SESSION)

    await t.useAuthStore.getState().login({ email: "a@b.co", password: "pw" })

    expect(t.useAuthStore.getState().status).toBe("authenticated")
  })
})

describe("logout and expireSession", () => {
  async function signedIn() {
    const t = load()
    t.authApi.login.mockResolvedValue(SESSION)
    await t.useAuthStore.getState().login({ email: "a@b.co", password: "pw" })
    t.useLibraryStore.setState({ likedTrackIds: ["t1"] })
    return t
  }

  it("signs out locally first, then tells the server, and clears everything", async () => {
    const t = await signedIn()
    let finish: () => void = () => {}
    t.authApi.logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )

    const done = t.useAuthStore.getState().logout()
    // Wait until the app has reached the server call (after clearing the device).
    while (t.authApi.logout.mock.calls.length === 0) await settle()

    // The server has not answered yet, but the user is already out.
    expect(t.useAuthStore.getState().status).toBe("unauthenticated")
    finish()
    await done

    expect(t.authApi.logout).toHaveBeenCalledWith("refresh-1")
    expect(await t.stored("auth.refresh")).toBeNull()
    expect(t.useLibraryStore.getState().likedTrackIds).toEqual([])
    expect(t.usePlayerStore.getState().currentTrack).toBeNull()
  })

  it("an offline logout still signs out and does not throw", async () => {
    const t = await signedIn()
    t.authApi.logout.mockRejectedValue(t.offline())

    await expect(t.useAuthStore.getState().logout()).resolves.toBeUndefined()

    expect(t.useAuthStore.getState().status).toBe("unauthenticated")
  })

  it("logging out without a refresh token does not call the server", async () => {
    const t = load()

    await t.useAuthStore.getState().logout()

    expect(t.authApi.logout).not.toHaveBeenCalled()
    expect(t.useAuthStore.getState().status).toBe("unauthenticated")
  })

  it("expireSession (the server said the session is invalid) does not call the server", async () => {
    const t = await signedIn()

    await t.useAuthStore.getState().expireSession()

    expect(t.authApi.logout).not.toHaveBeenCalled()
    expect(t.useAuthStore.getState()).toMatchObject({ status: "unauthenticated", token: null })
  })
})

describe("refreshSession", () => {
  async function withToken() {
    const t = load()
    t.authApi.login.mockResolvedValue(SESSION)
    await t.useAuthStore.getState().login({ email: "a@b.co", password: "pw" })
    return t
  }

  it("gives null when there is no refresh token", async () => {
    const t = load()

    expect(await t.useAuthStore.getState().refreshSession()).toBeNull()
    expect(t.authApi.refresh).not.toHaveBeenCalled()
  })

  it("keeps the new pair in memory and on the device, and returns the new access token", async () => {
    const t = await withToken()
    t.authApi.refresh.mockResolvedValue({ accessToken: "access-2", refreshToken: "refresh-2" })

    const token = await t.useAuthStore.getState().refreshSession()

    expect(token).toBe("access-2")
    expect(t.authApi.refresh).toHaveBeenCalledWith("refresh-1")
    expect(t.useAuthStore.getState()).toMatchObject({
      token: "access-2",
      refreshToken: "refresh-2",
    })
    expect(await t.stored("auth.token")).toBe("access-2")
    expect(await t.stored("auth.refresh")).toBe("refresh-2")
  })

  it.each([400, 401, 403])(
    "answers null when the server rejects the token with %i",
    async (status) => {
      const t = await withToken()
      t.authApi.refresh.mockRejectedValue(t.http(status))

      expect(await t.useAuthStore.getState().refreshSession()).toBeNull()
    },
  )

  it("lets network and server trouble through: that does not prove the session bad", async () => {
    const t = await withToken()
    t.authApi.refresh.mockRejectedValueOnce(t.offline())
    t.authApi.refresh.mockRejectedValueOnce(t.http(500))

    await expect(t.useAuthStore.getState().refreshSession()).rejects.toMatchObject({
      kind: "network",
    })
    await expect(t.useAuthStore.getState().refreshSession()).rejects.toMatchObject({ status: 500 })
    expect(t.useAuthStore.getState().status).toBe("authenticated")
  })
})

describe("setUser and the API client wiring", () => {
  it("setUser replaces the profile and saves it", async () => {
    const t = load()
    const premium = { ...USER, isPremium: true }

    await t.useAuthStore.getState().setUser(premium)

    expect(t.useAuthStore.getState().user).toEqual(premium)
    expect(JSON.parse((await t.stored("auth.user")) ?? "{}")).toEqual(premium)
  })

  it("a request the server keeps rejecting signs the user out", async () => {
    const t = load()
    t.authApi.login.mockResolvedValue(SESSION)
    await t.useAuthStore.getState().login({ email: "a@b.co", password: "pw" })
    t.authApi.refresh.mockRejectedValue(t.http(401)) // the refresh token is dead as well
    globalThis.fetch = jest.fn(async () => ({
      status: 401,
      ok: false,
      text: async () => "{}",
    })) as unknown as typeof fetch

    await expect(t.api.get("/auth/me")).rejects.toMatchObject({ status: 401 })
    await settle()

    expect(t.useAuthStore.getState().status).toBe("unauthenticated")
  })

  it("a request that fails with an expired access token is retried with the refreshed one", async () => {
    const t = load()
    t.authApi.login.mockResolvedValue(SESSION)
    await t.useAuthStore.getState().login({ email: "a@b.co", password: "pw" })
    t.authApi.refresh.mockResolvedValue({ accessToken: "access-2", refreshToken: "refresh-2" })
    const calls: string[] = []
    globalThis.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization
      calls.push(auth)
      const ok = auth === "Bearer access-2"
      return { status: ok ? 200 : 401, ok, text: async () => "{}" }
    }) as unknown as typeof fetch
    await t.api.get("/auth/me")

    expect(calls).toEqual(["Bearer access-1", "Bearer access-2"])
    expect(t.useAuthStore.getState().refreshToken).toBe("refresh-2")
  })
})
