/**
 * Types of the backend REST API. Kept apart from `@/types` (mock/UI models such as Track) so
 * the two worlds never get mixed up.
 */
export type UserRole = "USER" | "ADMIN"

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: UserRole
  isPremium: boolean
}

/** Short-lived access token (JWT) plus the single-use refresh token that renews it. */
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends TokenPair {
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

/** Error body returned by NestJS. */
export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  error?: string
}
