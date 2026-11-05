import { jest } from "@jest/globals"

/** In-memory stand-in for expo-secure-store (the real one needs the native Keychain / Keystore). */
const values = new Map<string, string>()

export const getItemAsync = jest.fn(async (key: string): Promise<string | null> => {
  return values.get(key) ?? null
})
export const setItemAsync = jest.fn(async (key: string, value: string): Promise<void> => {
  values.set(key, value)
})
export const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  values.delete(key)
})

/** Test helper: forget everything that was stored and every recorded call. */
export function resetSecureStore(): void {
  values.clear()
  getItemAsync.mockClear()
  setItemAsync.mockClear()
  deleteItemAsync.mockClear()
}

/** Test helper: read what the app stored. */
export const peekSecureStore = (key: string): string | undefined => values.get(key)
