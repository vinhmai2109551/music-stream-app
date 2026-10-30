import { create } from "zustand"
import * as authApi from "@/api/auth"
import { ApiError, configureApi } from "@/api/client"
import type { AuthResponse, LoginInput, RegisterInput, User } from "@/api/types"
import {
  clearSession,
  loadSession,
  saveSession,
  saveTokens,
  saveUser,
} from "@/utils/sessionStorage"
import { useAppStore } from "./appStore"
import { useLibraryStore } from "./libraryStore"
import { usePlayerStore } from "./playerStore"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthState = {
  status: AuthStatus
  user: User | null
  /** Access token (JWT, short lived). */
  token: string | null
  /** Opaque, single-use token that renews the access token. */
  refreshToken: string | null
}

type AuthActions = {
  /** Restores the saved session. Call once at app start. */
  bootstrap: () => Promise<void>
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  /** Revokes the refresh token on the server (best effort) and clears the session locally. */
  logout: () => Promise<void>
  /** Clears the session locally only; for when the server already said it is invalid. */
  expireSession: () => Promise<void>
  /** Renews the token pair; used by the API client. Null means the refresh token was rejected. */
  refreshSession: () => Promise<string | null>
}

export type AuthStore = AuthState & AuthActions

const SIGNED_OUT: AuthState = {
  status: "unauthenticated",
  user: null,
  token: null,
  refreshToken: null,
}

/** Statuses that mean "this refresh token is not valid", as opposed to "try again later". */
const REFRESH_REJECTED = [400, 401, 403]

let bootstrapPromise: Promise<void> | null = null

export const useAuthStore = create<AuthStore>()((set, get) => {
  const startSession = async ({ accessToken, refreshToken, user }: AuthResponse) => {
    await saveSession({ accessToken, refreshToken }, user)
    set({ status: "authenticated", user, token: accessToken, refreshToken })
  }

  const expireSession = async () => {
    // Switch the UI first, then clean up.
    set(SIGNED_OUT)
    usePlayerStore.getState().reset()
    useLibraryStore.getState().reset()
    useAppStore.getState().start("login")
    await clearSession()
  }

  /** Used by the API client when an access token is rejected. */
  const refreshSession = async (): Promise<string | null> => {
    const { refreshToken } = get()
    if (!refreshToken) return null
    try {
      const pair = await authApi.refresh(refreshToken)
      // Keep the new pair in memory first so requests that follow already use it.
      set({ token: pair.accessToken, refreshToken: pair.refreshToken })
      await saveTokens(pair)
      return pair.accessToken
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.kind === "http" &&
        REFRESH_REJECTED.includes(error.status)
      ) {
        return null
      }
      throw error // offline or server trouble: the session itself is not proven bad
    }
  }

  const restoreSession = async () => {
    const saved = await loadSession()
    if (!saved.token || !saved.refreshToken) {
      // Nothing usable (or a leftover from before refresh tokens existed).
      await clearSession()
      set(SIGNED_OUT)
      return
    }

    // Put the tokens in the store first: the API client reads them from here.
    set({ token: saved.token, refreshToken: saved.refreshToken, user: saved.user })
    try {
      // If the access token expired, the client refreshes it and retries transparently.
      const user = await authApi.getMe()
      await saveUser(user)
      set({ status: "authenticated", user })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await get().expireSession() // the refresh token was rejected too
      } else if (saved.user) {
        // Offline or server trouble: keep the saved session so the app still opens.
        set({ status: "authenticated" })
      } else {
        // No cached profile to show; fall back to the login screen but keep the tokens on disk.
        set({ ...SIGNED_OUT })
      }
    }
  }

  return {
    status: "loading",
    user: null,
    token: null,
    refreshToken: null,

    bootstrap: () => {
      bootstrapPromise ??= restoreSession()
      return bootstrapPromise
    },

    login: async (input) => startSession(await authApi.login(input)),
    register: async (input) => startSession(await authApi.register(input)),

    logout: async () => {
      const { refreshToken } = get()
      // Local sign-out comes first so a slow or failing network can never keep the user in.
      await expireSession()
      if (!refreshToken) return
      try {
        await authApi.logout(refreshToken)
      } catch {
        // Offline: the token simply expires on its own (30 days) - nothing else to do.
      }
    },

    expireSession,
    refreshSession,
  }
})

configureApi({
  getToken: () => useAuthStore.getState().token,
  refreshSession: () => useAuthStore.getState().refreshSession(),
  onUnauthorized: () => {
    void useAuthStore.getState().expireSession()
  },
})
