import { api } from "./client"
import type { AuthResponse, LoginInput, RegisterInput, User } from "./types"

// Credentials requests never carry a token and a 401 there just means "wrong password".
export const login = (input: LoginInput) =>
  api.post<AuthResponse>("/auth/login", input, { skipAuth: true })

export const register = (input: RegisterInput) =>
  api.post<AuthResponse>("/auth/register", input, { skipAuth: true })

export const getMe = () => api.get<User>("/auth/me")
