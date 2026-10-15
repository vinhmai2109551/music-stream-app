import { create } from "zustand"
import * as authApi from "@/api/auth"
import { ApiError, configureApi } from "@/api/client"
import type { AuthResponse, LoginInput, RegisterInput, User } from "@/api/types"
import { clearSession, loadSession, saveSession, saveUser } from "@/utils/sessionStorage"
import { useAppStore } from "./appStore"
import { usePlayerStore } from "./playerStore"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthState = {
  status: AuthStatus
  user: User | null
  token: string | null
}

type AuthActions = {
  /** Restores the saved session. Call once at app start. */
  bootstrap: () => Promise<void>
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

export type AuthStore = AuthState & AuthActions

let bootstrapPromise: Promise<void> | null = null

export const useAuthStore = create<AuthStore>()((set, get) => {
  const startSession = async ({ accessToken, user }: AuthResponse) => {
    await saveSession(accessToken, user)
    set({ status: "authenticated", user, token: accessToken })
  }

  const restoreSession = async () => {
    const saved = await loadSession()
    if (!saved.token) {
      set({ status: "unauthenticated", user: null, token: null })
      return
    }

    // Put the token in the store first: the API client reads it from here.
    set({ token: saved.token, user: saved.user })
    try {
      const user = await authApi.getMe()
      await saveUser(user)
      set({ status: "authenticated", user })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The token is no longer valid (expired, or the account is gone).
        await get().logout()
      } else if (saved.user) {
        // Offline or server trouble: keep the saved session so the app still opens.
        set({ status: "authenticated" })
      } else {
        // No cached profile to show; fall back to the login screen but keep the token on disk.
        set({ status: "unauthenticated", user: null, token: null })
      }
    }
  }

  return {
    status: "loading",
    user: null,
    token: null,

    bootstrap: () => {
      bootstrapPromise ??= restoreSession()
      return bootstrapPromise
    },

    login: async (input) => startSession(await authApi.login(input)),
    register: async (input) => startSession(await authApi.register(input)),

    logout: async () => {
      // Switch the UI first, then clean up.
      set({ status: "unauthenticated", user: null, token: null })
      usePlayerStore.getState().reset()
      useAppStore.getState().start("login")
      await clearSession()
    },
  }
})

configureApi({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    void useAuthStore.getState().logout()
  },
})
