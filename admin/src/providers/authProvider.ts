import type { AuthProvider } from "@refinedev/core"
import { api } from "@/api/http"
import { ApiError } from "@/api/errors"
import { tokenStore } from "@/api/tokens"
import type { AuthUser, LoginResult } from "@/api/types"

export interface LoginParams {
  email: string
  password: string
  /** Token of the Cloudflare Turnstile widget, when the form has one. */
  turnstileToken?: string
}

export interface Identity {
  id: string
  name: string
  email: string
  avatar: string | null
}

export const NOT_ADMIN_TITLE = "Không có quyền admin"

/** Who is logged in, from the login or the first `/auth/me`; not asked for again on every page. */
let identity: (Identity & { role: AuthUser["role"] }) | null = null

const toIdentity = (user: AuthUser): Identity & { role: AuthUser["role"] } => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatarUrl,
  role: user.role,
})

/** The login errors of the API are in English; the ones a person can meet are shown in Vietnamese. */
export function loginErrorMessage(error: ApiError): string {
  if (error.statusCode === 0) return error.message
  if (error.statusCode === 429)
    return "Thử đăng nhập quá nhiều lần. Vui lòng đợi một lát rồi thử lại."
  if (error.statusCode === 403) return "Tài khoản này đã bị khoá. Hãy liên hệ quản trị viên."
  if (error.statusCode === 401) return "Email hoặc mật khẩu không đúng."
  if (/security check/i.test(error.message)) {
    return "Chưa qua bước kiểm tra bảo mật. Hãy xác minh lại rồi đăng nhập."
  }
  return error.message
}

function failure(name: string, message: string) {
  return { success: false as const, error: { name, message } }
}

export const authProvider: AuthProvider = {
  async login({ email, password, turnstileToken }: LoginParams) {
    try {
      const result = await api<LoginResult>("/auth/login", {
        method: "POST",
        body: { email, password, turnstileToken: turnstileToken || undefined },
        auth: false,
      })
      if (result.user.role !== "ADMIN") {
        // The login worked, so the API issued a refresh token: end it instead of leaving it valid.
        void api("/auth/logout", {
          method: "POST",
          body: { refreshToken: result.refreshToken },
          auth: false,
        }).catch(() => undefined)
        return failure(NOT_ADMIN_TITLE, "Tài khoản này không phải quản trị viên.")
      }
      tokenStore.save(result)
      identity = toIdentity(result.user)
      return { success: true, redirectTo: "/" }
    } catch (error) {
      if (error instanceof ApiError) return failure("Đăng nhập thất bại", loginErrorMessage(error))
      throw error
    }
  },

  async logout() {
    const refreshToken = tokenStore.refreshToken
    tokenStore.clear()
    identity = null
    if (refreshToken) {
      // Best effort: the token stops working on the server too, but logging out never waits for it.
      void api("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }).catch(
        () => undefined,
      )
    }
    return { success: true, redirectTo: "/login" }
  },

  async check() {
    const loggedOut = { authenticated: false, logout: true, redirectTo: "/login" }
    if (!tokenStore.accessToken && !tokenStore.refreshToken) return loggedOut
    if (identity) return { authenticated: true }
    try {
      const me = await api<AuthUser>("/auth/me")
      if (me.role !== "ADMIN") {
        tokenStore.clear()
        return {
          ...loggedOut,
          error: { name: NOT_ADMIN_TITLE, message: "Tài khoản này không phải quản trị viên." },
        }
      }
      identity = toIdentity(me)
      return { authenticated: true }
    } catch (error) {
      // A server that cannot be reached is not a reason to log the person out.
      if (error instanceof ApiError && (error.statusCode === 0 || error.statusCode >= 500)) {
        return { authenticated: true }
      }
      tokenStore.clear()
      return loggedOut
    }
  },

  async onError(error: unknown) {
    if (error instanceof ApiError && error.statusCode === 401) {
      return { logout: true, redirectTo: "/login", error }
    }
    return {}
  },

  async getIdentity() {
    if (!identity) {
      const me = await api<AuthUser>("/auth/me")
      identity = toIdentity(me)
    }
    return identity
  },

  async getPermissions() {
    return identity?.role ?? null
  },
}
