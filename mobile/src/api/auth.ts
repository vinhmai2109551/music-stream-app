import { api } from "./client"
import type { AuthResponse, LoginInput, RegisterInput, TokenPair, User } from "./types"

// Credentials requests never carry a token and a 401 there just means "wrong password".
export const login = (input: LoginInput) =>
  api.post<AuthResponse>("/auth/login", input, { skipAuth: true })

export const register = (input: RegisterInput) =>
  api.post<AuthResponse>("/auth/register", input, { skipAuth: true })

export const getMe = () => api.get<User>("/auth/me")

// These two authenticate with the refresh token in the body, so they must not send (or refresh)
// an access token themselves.
export const refresh = (refreshToken: string) =>
  api.post<TokenPair>("/auth/refresh", { refreshToken }, { skipAuth: true })

export const logout = (refreshToken: string) =>
  api.post<void>("/auth/logout", { refreshToken }, { skipAuth: true })
