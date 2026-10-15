import * as SecureStore from "expo-secure-store"
import type { User } from "@/api/types"

// SecureStore keys may only contain letters, digits, ".", "-" and "_".
const TOKEN_KEY = "auth.token"
const USER_KEY = "auth.user"

export interface StoredSession {
  token: string | null
  /** Last known profile, so the app can open offline. */
  user: User | null
}

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false
  const user = value as Record<string, unknown>
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.name === "string" &&
    (typeof user.avatarUrl === "string" || user.avatarUrl === null) &&
    (user.role === "USER" || user.role === "ADMIN") &&
    typeof user.isPremium === "boolean"
  )
}

/** The token lives only in SecureStore (Keychain / Keystore), never in AsyncStorage. */
export async function loadSession(): Promise<StoredSession> {
  try {
    const [token, rawUser] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ])
    let user: User | null = null
    if (rawUser) {
      try {
        const parsed: unknown = JSON.parse(rawUser)
        user = isUser(parsed) ? parsed : null
      } catch {
        user = null
      }
    }
    return { token, user }
  } catch (error) {
    console.warn("Could not read the saved session", error)
    return { token: null, user: null }
  }
}

export async function saveSession(token: string, user: User): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ])
  } catch (error) {
    // The session still works in memory; it just will not survive a restart.
    console.warn("Could not save the session", error)
  }
}

export async function saveUser(user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
  } catch (error) {
    console.warn("Could not save the profile", error)
  }
}

export async function clearSession(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ])
  } catch (error) {
    console.warn("Could not clear the session", error)
  }
}
